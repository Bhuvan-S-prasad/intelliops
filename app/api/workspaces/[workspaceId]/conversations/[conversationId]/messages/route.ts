import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireWorkspaceAccess } from '@/lib/auth'
import { checkAiLimit } from '@/lib/rate-limit'
import { embedChunks } from '@/lib/embedder'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
})

interface SearchResult {
  id: string
  fileId: string
  content: string
  metadata: Record<string, unknown>
  chunkIndex: number
  fileName: string
  fileType: string
  similarity: number
}

// POST /api/workspaces/[workspaceId]/conversations/[conversationId]/messages
// Send a user message, perform semantic vector retrieval, and stream the grounded AI response
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; conversationId: string }> }
) {
  const { workspaceId, conversationId } = await params

  try {
    // 1. Authenticate user and verify workspace access (at least USER role)
    const { user } = await requireWorkspaceAccess(workspaceId, 'USER')

    // 2. Perform AI request rate limiting on the userId
    const rateCheck = await checkAiLimit(user.id)
    if (!rateCheck.success) {
      const retryAfter = Math.ceil((rateCheck.reset - Date.now()) / 1000)
      return Response.json(
        { error: 'AI limit reached. Please try again later.', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    // 3. Parse and validate message payload
    const body = await req.json()
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { content } = parsed.data

    // 4. Validate that the conversation exists and belongs to this workspace and user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
        userId: user.id,
      },
    })

    if (!conversation) {
      return Response.json({ error: 'Conversation not found or access denied' }, { status: 404 })
    }

    // 5. Save the user message to the database
    await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
      },
    })

    // 6. Generate embedding of the user's message
    let chunks: SearchResult[] = []
    try {
      const embeddings = await embedChunks([content])
      if (embeddings && embeddings.length > 0) {
        const queryEmbedding = embeddings[0]
        const queryEmbeddingStr = `[${queryEmbedding.join(',')}]`

        // 7. Query pgvector for the top 6 closest chunks (similarity > 0.35)
        chunks = await prisma.$queryRaw<SearchResult[]>`
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
            AND 1 - (c.embedding <=> ${queryEmbeddingStr}::vector) > 0.35
          ORDER BY c.embedding <=> ${queryEmbeddingStr}::vector
          LIMIT 6
        `
        console.log(chunks)
      }
    
    } catch (embedErr) {
      console.warn('Vector retrieval failed. Bypassing context injection:', embedErr)
    }

    // 8. Build context string
    const contextString = chunks
      .map((c) => `[Source: ${c.fileName}, chunk ${c.chunkIndex}]\n${c.content}`)
      .join('\n\n')

    // 9. Build system prompt instruction
    const systemPrompt = `You are IntelliOps, an AI operations intelligence assistant. You help users analyse operational data — logs, reports, CSVs, and documents — that have been uploaded to their workspace.

Answer the user's question based ONLY on the context provided below. If the answer is not in the context, say so clearly. Do not hallucinate information.

When referencing information, cite the source file name inline using [Source: filename] notation.

Context:
${contextString}`

    // 10. Fetch the last 6 messages for chat history
    const dbMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })

    // Reverse descending order to chronological order
    const history = dbMessages.reverse()

    const formattedMessages = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // 11. Call OpenRouter with Vercel AI SDK
    const apiKey = process.env.OPENROUTER_API_KEY || ''
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    })

    const result = await streamText({
      model: openrouter.chat('openai/gpt-oss-20b:free'),
      system: systemPrompt,
      messages: formattedMessages,
      onFinish: async ({ text }) => {
        try {
          const sources = chunks.map((c) => ({
            chunkId: c.id,
            fileId: c.fileId,
            fileName: c.fileName,
            similarity: c.similarity,
          }))

          // Save AI response message
          await prisma.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: text,
              sources: sources as Prisma.InputJsonValue,
            },
          })

          // Update conversation updatedAt timestamp
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          })
        } catch (dbErr) {
          console.error('Failed to save assistant response to DB:', dbErr)
        }
      },
    })

    // 12. Stream the response using Vercel AI SDK standard stream response
    return result.toTextStreamResponse()
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/workspaces/[workspaceId]/conversations/[conversationId]/messages error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
