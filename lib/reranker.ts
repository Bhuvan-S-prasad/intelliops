import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export interface SearchResult {
  id: string
  fileId: string
  content: string
  metadata: Record<string, unknown>
  chunkIndex: number
  fileName: string
  fileType: string
  similarity: number
}

export async function rerankChunks(
  query: string,
  chunks: SearchResult[],
  limit: number
): Promise<SearchResult[]> {
  if (chunks.length === 0) return []
  
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn('[reranker] OPENROUTER_API_KEY is not defined. Skipping reranking.')
    return chunks.slice(0, limit)
  }

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })

  try {
    const prompt = `You are an expert search result reranker for a developer and operations document search engine.
Evaluate the relevance of the following document chunks to the user's search query.

User Query: "${query}"

For each chunk, assign a relevance score between 0.0 and 10.0 (where 10.0 means extremely relevant, directly answers the query or contains exact matching information, and 0.0 means completely irrelevant).

Provide your output in exactly the following format:
ID: <chunk_id> | Score: <score>
ID: <chunk_id> | Score: <score>

Chunks:
${chunks.map((c, i) => `--- CHUNK ${i + 1} ---
ID: ${c.id}
File: ${c.fileName} (${c.fileType})
Content: ${c.content}`).join('\n\n')}

Provide ONLY the scored list matching the format. Do NOT include any introduction, explanations, quotes, summary, or notes. Ensure every Chunk ID listed above receives a score.`

    const { text } = await generateText({
      model: openrouter.chat('openai/gpt-oss-20b:free'),
      prompt,
    })

    console.log('[reranker] Raw LLM scoring response:\n', text)

    // Parse the scores
    const scores: Record<string, number> = {}
    const lines = text.split('\n')
    for (const line of lines) {
      // Regex matches: ID: chunk_xyz | Score: 8.5
      const match = line.match(/ID:\s*(\S+)\s*\|\s*Score:\s*([\d.]+)/i)
      if (match) {
        const id = match[1].trim()
        const score = parseFloat(match[2].trim())
        if (!isNaN(score)) {
          scores[id] = score
        }
      }
    }

    // Sort the chunks by the LLM score
    const scoredChunks = chunks.map(chunk => {
      const llmScore = scores[chunk.id] !== undefined ? scores[chunk.id] : 0
      return {
        chunk,
        score: llmScore,
      }
    })

    // Sort descending by score. If scores are equal, fall back to original vector similarity/RRF order
    scoredChunks.sort((a, b) => b.score - a.score)

    console.log('[reranker] Sorted chunks with LLM scores:', scoredChunks.map(sc => `${sc.chunk.id} (Score: ${sc.score}, Similarity: ${sc.chunk.similarity.toFixed(3)})`))

    return scoredChunks.map(sc => sc.chunk).slice(0, limit)
  } catch (error) {
    console.error('[reranker] Failed to rerank chunks:', error)
    return chunks.slice(0, limit)
  }
}
