import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import { downloadFile } from './storage'
import { chunkText } from './chunker'
import { embedChunks } from './embedder'
import { parsePdf } from './parsers/pdf-parser'
import { parseCsv } from './parsers/csv-parser'
import { parseJson } from './parsers/json-parser'
import { parseText } from './parsers/text-parser'
import { parseLog } from './parsers/log-parser'
import { parseImage } from './parsers/image-parser'
import { randomUUID } from 'crypto'
import { generateFileSummary } from './insight-generator'

export async function processFile(fileId: string): Promise<void> {
  try {
    // 1. Fetch file record and update status to PROCESSING
    const file = await prisma.file.update({
      where: { id: fileId },
      data: { status: 'PROCESSING' },
      select: {
        id: true,
        workspaceId: true,
        fileType: true,
        storageKey: true,
        mimeType: true,
      },
    })

    // Download file bytes from Supabase storage
    const buffer = await downloadFile(file.storageKey)

    // 2. Parse file based on fileType
    let parseResult: { text: string; metadata: Record<string, unknown> }
    switch (file.fileType) {
      case 'PDF':
        parseResult = await parsePdf(buffer)
        break
      case 'CSV':
        parseResult = await parseCsv(buffer)
        break
      case 'JSON':
        parseResult = await parseJson(buffer)
        break
      case 'TXT':
        parseResult = await parseText(buffer)
        break
      case 'LOG':
        parseResult = await parseLog(buffer)
        break
      case 'IMAGE':
        parseResult = await parseImage(buffer, file.mimeType)
        break
      default:
        throw new Error(`Unsupported file type: ${file.fileType}`)
    }

    // 3. Chunk text on sentence/paragraph boundaries
    const chunks = chunkText(parseResult.text)

    // 4. Generate vector embeddings for the chunks
    let embeddings: number[][] = []
    if (chunks.length > 0) {
      const chunkTexts = chunks.map(c => c.content)
      embeddings = await embedChunks(chunkTexts)
    }

    // 5. Save chunks to DB (batch inserts in transactions of size 50)
    const batchSize = 25
    for (let i = 0; i < chunks.length; i += batchSize) {
      const chunkBatch = chunks.slice(i, i + batchSize)
      const embeddingBatch = embeddings.slice(i, i + batchSize)

      await prisma.$transaction(
        chunkBatch.map((chunk, index) => {
          const chunkId = `chunk_${randomUUID()}`
          const embedding = embeddingBatch[index]
          const embeddingString = `[${embedding.join(',')}]`
          const metadataJson = JSON.stringify({
            ...parseResult.metadata,
            fileId,
            chunkIndex: chunk.chunkIndex,
          })

          return prisma.$executeRaw`
            INSERT INTO "Chunk" (id, "fileId", "workspaceId", content, "chunkIndex", "tokenCount", embedding, metadata, "createdAt")
            VALUES (
              ${chunkId},
              ${fileId},
              ${file.workspaceId},
              ${chunk.content},
              ${chunk.chunkIndex},
              ${chunk.tokenCount},
              ${embeddingString}::vector,
              ${metadataJson}::jsonb,
              NOW()
            )
          `
        }),
        {
          maxWait: 15000,
          timeout: 30000,
        }
      )
    }

    // 6. Update file status to READY with counts and metadata
    const pageCount = file.fileType === 'PDF' ? (parseResult.metadata.pageCount as number) : null
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'READY',
        chunkCount: chunks.length,
        pageCount,
        metadata: parseResult.metadata as Prisma.InputJsonValue,
      },
    })
    console.log(`[file-processor] Successfully processed file ${fileId}`)

    try {
      await generateFileSummary(fileId)
      console.log(`[file-processor] Successfully generated summary for file ${fileId}`)
    } catch (summaryErr) {
      console.error(`[file-processor] Failed to generate summary for file ${fileId}:`, summaryErr)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during file ingestion'
    console.error(`[file-processor] Failed to process file ${fileId}:`, err)

    try {
      await prisma.file.update({
        where: { id: fileId },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      })
    } catch (dbErr) {
      console.error(`[file-processor] Failed to write failure status to DB for file ${fileId}:`, dbErr)
    }
  }
}
