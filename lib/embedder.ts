export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not defined')
  }

  const batchSize = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const embeddings = await embedBatchWithRetry(batch, apiKey)
    allEmbeddings.push(...embeddings)
  }

  return allEmbeddings
}

async function embedBatchWithRetry(
  batch: string[], 
  apiKey: string, 
  retries = 3, 
  delay = 1000
): Promise<number[][]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/Bhuvan-S-prasad/intelliops',
        'X-Title': 'IntelliOps',
      },
      body: JSON.stringify({
        model: 'nvidia/llama-nemotron-embed-vl-1b-v2:free',
        input: batch,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error (status ${response.status}): ${errorText}`)
    }

    const json = await response.json()
    const data = json.data as { embedding: number[]; index: number }[]
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid response format from OpenRouter embeddings API')
    }

    // Sort to ensure original order of input chunks is strictly matched
    const sortedData = [...data].sort((a, b) => a.index - b.index)
    return sortedData.map(d => {
      // Truncate to 1536 dimensions (MRL slicing)
      const embedding = d.embedding.slice(0, 1536)
      // Pad with zeros if the response vector size is unexpectedly smaller than 1536
      while (embedding.length < 1536) {
        embedding.push(0)
      }
      return embedding
    })
  } catch (err) {
    if (retries > 0) {
      console.warn(`Embedding failed, retrying in ${delay}ms... Remaining retries: ${retries}. Error: ${err}`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return embedBatchWithRetry(batch, apiKey, retries - 1, delay * 2)
    }
    throw err
  }
}
