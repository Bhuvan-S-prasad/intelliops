import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'
import { checkAiLimit } from '@/lib/rate-limit'
import { getCache, setCache } from '@/lib/cache'
import { embedChunks } from '@/lib/embedder'
import { createHash } from 'crypto'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(20).default(8),
})

interface SearchResult {
  id: string
  fileId: string
  content: string
  metadata: Record<string, unknown>
  chunkIndex: number
  fileName: string
  fileType: 'PDF' | 'CSV' | 'JSON' | 'TXT' | 'LOG'
  similarity: number
}

function sha256(str: string): string {
  return createHash('sha256').update(str).digest('hex')
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // 1. Authenticate user & verify they have at least USER workspace permission
    const { user } = await requireWorkspaceAccess(workspaceId, 'USER')

    // 2. Perform AI request rate-limiting on userId (30 requests per minute)
    const rateCheck = await checkAiLimit(user.id)
    if (!rateCheck.success) {
      const retryAfter = Math.ceil((rateCheck.reset - Date.now()) / 1000)
      return Response.json(
        { error: 'AI search limit reached. Please try again later.', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    // 3. Parse and validate JSON request body
    const body = await req.json()
    const parsed = searchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { query, limit } = parsed.data

    // 4. Inspect cache first using the search key
    const cacheKey = `search:${workspaceId}:${sha256(query)}`
    const cachedResults = await getCache<SearchResult[]>(cacheKey)
    if (cachedResults) {
      // Return sliced results matching the requested limit
      return Response.json({ results: cachedResults.slice(0, limit) })
    }

    // 5. Generate query embedding from the input text
    const embeddings = await embedChunks([query])
    if (embeddings.length === 0) {
      return Response.json({ error: 'Failed to generate query embedding' }, { status: 500 })
    }
    const queryEmbedding = embeddings[0]
    const queryEmbeddingStr = `[${queryEmbedding.join(',')}]`

    // Debug: Check if query embedding is valid
    console.log(`[search] Query embedding dimensions: ${queryEmbedding.length}`)
    console.log(`[search] First 5 embedding values: [${queryEmbedding.slice(0, 5).join(', ')}]`)

    // Debug: Check if chunks containing the query term exist
    const queryTermChunks = await prisma.$queryRaw<Array<{ id: string; content: string }>>`
      SELECT id, content
      FROM "Chunk"
      WHERE "workspaceId" = ${workspaceId}
        AND content ILIKE ${'%' + query + '%'}
      LIMIT 5
    `
    console.log(`[search] Found ${queryTermChunks.length} chunks containing search term "${query}" (case-insensitive)`)
    if (queryTermChunks.length > 0) {
      queryTermChunks.forEach((c, i) => {
        console.log(`  [${i + 1}] Content preview: "${c.content.substring(0, 60)}..."`)
      })
    } else {
      console.log(`[search] ℹ️ No chunks found containing "${query}" - search is semantic, not keyword-based`)
    }

    // 6. Run pgvector cosine similarity search query - direct query without diagnostics
    const allResults = await prisma.$queryRaw<SearchResult[]>`
      SELECT
        c.id,
        c."fileId",
        c.content,
        c.metadata,
        c."chunkIndex",
        f.name as "fileName",
        f."fileType",
        1 - (c.embedding <=> ${queryEmbeddingStr}::vector) as similarity
      FROM "Chunk" c
      JOIN "File" f ON f.id = c."fileId"
      WHERE c."workspaceId" = ${workspaceId}
        AND f.status = 'READY'
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${queryEmbeddingStr}::vector
      LIMIT 50
    `
    
    // Log all retrieved chunks for debugging
    console.log(`[search] Query: "${query}"`)
    console.log(`[search] Retrieved ${allResults.length} chunks (raw results before filtering)`)
    allResults.slice(0, 10).forEach((chunk, i) => {
      const preview = chunk.content.substring(0, 80).replace(/\n/g, ' ')
      console.log(`  [${i + 1}] Similarity: ${(chunk.similarity * 100).toFixed(1)}% | File: ${chunk.fileName} | Content: "${preview}..."`)
    })
    
    // Filter to only include results above 10% similarity (TEMPORARILY LOWERED FOR DEBUGGING)
    // TODO: Adjust this threshold based on embedding quality
    const filteredResults = allResults.filter(r => r.similarity > 0.10)
    
    if (filteredResults.length === 0 && allResults.length > 0) {
      console.warn(`[search] ⚠️ No results exceeded 10% similarity threshold (lowered for debugging).`)
      console.warn(`[search] Top similarity: ${(allResults[0].similarity * 100).toFixed(1)}%`)
      console.warn(`[search] This indicates embeddings may not be stored correctly or have poor quality`)
    } else if (filteredResults.length > 0) {
      console.log(`[search] ✓ Found ${filteredResults.length} results above 10% threshold`)
    } else {
      console.log(`[search] No chunks found in workspace`)
    }

    // 7. Write to cache with 10 minutes (600 seconds) TTL
    await setCache<SearchResult[]>(cacheKey, filteredResults, 600)

    // Return only the requested number of results
    return Response.json({ results: filteredResults.slice(0, limit) })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/workspaces/[workspaceId]/search error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
