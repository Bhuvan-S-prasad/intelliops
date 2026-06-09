import { prisma } from './prisma'

export async function processFile(fileId: string): Promise<void> {
  try {
    // 1. Move the file status to PROCESSING
    await prisma.file.update({
      where: { id: fileId },
      data: { status: 'PROCESSING' },
    })
    console.log(`[processor] File ${fileId} status updated to PROCESSING`)

    // 2. Simulate document indexing work (e.g. parsing, chunking, vector embedding)
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // 3. Mark the file status as READY
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'READY',
        chunkCount: 1, // Mock chunk count for Phase 1
        pageCount: 1,  // Mock page count
      },
    })
    console.log(`[processor] File ${fileId} status updated to READY`)
  } catch (err) {
    console.error(`[processor] Failed to process file ${fileId}:`, err)

    // Set file status to FAILED in database
    try {
      await prisma.file.update({
        where: { id: fileId },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Unknown error processing file',
        },
      })
    } catch (dbErr) {
      console.error(`[processor] Failed to update status to FAILED for file ${fileId}:`, dbErr)
    }
  }
}
