import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export async function rewriteQuery(query: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn('[query-rewriter] OPENROUTER_API_KEY is not defined. Skipping query rewriting.')
    return query
  }

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })

  try {
    const prompt = `You are a query optimizer for an operational intelligence search system.
Your task is to rewrite the user's search query to optimize it for a combination of dense semantic vector search and sparse keyword full-text search.
Analyze the query and expand it with technical synonyms, typical logging keywords, database terms, or system variables that are highly likely to appear in log files, reports, CSV headers, or system documentation related to the query.

User Query: "${query}"

Return ONLY the rewritten, expanded query string. Do NOT include any introduction, formatting, quotes, explanation, or notes.`

    const { text } = await generateText({
      model: openrouter.chat('openai/gpt-oss-20b:free'),
      prompt,
    })

    const cleanedText = text.trim().replace(/^["']|["']$/g, '')
    console.log(`[query-rewriter] Rewrote "${query}" -> "${cleanedText}"`)
    return cleanedText || query
  } catch (error) {
    console.error('[query-rewriter] Failed to rewrite query:', error)
    return query
  }
}
