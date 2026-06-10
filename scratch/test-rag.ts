import { rewriteQuery } from '../lib/query-rewriter'
import { rerankChunks, SearchResult } from '../lib/reranker'

async function main() {
  console.log('--- STARTING RAG PIPELINE TEST ---')

  // 1. Test query rewriter
  const originalQuery = 'why did the deployment fail'
  console.log(`Original query: "${originalQuery}"`)
  const rewritten = await rewriteQuery(originalQuery)
  console.log(`Rewritten query: "${rewritten}"`)

  // 2. Test reranker with mock search results
  const mockChunks: SearchResult[] = [
    {
      id: 'chunk_1',
      fileId: 'file_a',
      content: 'The application server started successfully on port 8080.',
      metadata: {},
      chunkIndex: 1,
      fileName: 'logs.txt',
      fileType: 'TXT',
      similarity: 0.45,
    },
    {
      id: 'chunk_2',
      fileId: 'file_b',
      content: 'ERROR: Database connection timeout. Deployment aborted. FAILED at 2026-06-10T09:40:00Z',
      metadata: {},
      chunkIndex: 2,
      fileName: 'deploy-error.log',
      fileType: 'LOG',
      similarity: 0.65,
    },
    {
      id: 'chunk_3',
      fileId: 'file_c',
      content: 'Please make sure to set the environment variable DATABASE_URL before launching the service.',
      metadata: {},
      chunkIndex: 3,
      fileName: 'readme.md',
      fileType: 'TXT',
      similarity: 0.50,
    },
  ]

  console.log('\nCandidates for reranking:')
  mockChunks.forEach(c => console.log(`- [${c.id}] Sim: ${c.similarity} | ${c.content}`))

  console.log(`\nRerank query: "${originalQuery}"`)
  const reranked = await rerankChunks(originalQuery, mockChunks, 3)

  console.log('\nAfter Reranking (top to bottom):')
  reranked.forEach((c, idx) => {
    console.log(`${idx + 1}. [${c.id}] ${c.content}`)
  })

  console.log('--- TEST COMPLETE ---')
}

main().catch(err => {
  console.error('Test run failed:', err)
})
