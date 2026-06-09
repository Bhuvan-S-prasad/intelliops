import { prisma } from './prisma'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { Prisma } from '@prisma/client'

// 1. OpenRouter client configuration
const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY || ''
  return createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })
}

// Helper to sanitize JSON response from models that might output markdown codeblocks
function parseModelJson<T>(text: string): T {
  let cleanText = text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()
  }
  return JSON.parse(cleanText) as T
}

interface FileSummaryResponse {
  title: string
  summary: string
  keyPoints: string[]
  documentType: string
  timeRange: string | null
}

interface IssueItem {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  sourceFiles: string[]
  suggestedAction: string
}

interface KeyIssuesResponse {
  issues: IssueItem[]
}

interface TrendItem {
  title: string
  category: 'pattern' | 'anomaly' | 'trend'
  description: string
  confidence: 'high' | 'medium' | 'low'
  sourceFiles: string[]
}

interface TrendsResponse {
  trends: TrendItem[]
}

/**
 * a) generateFileSummary(fileId: string)
 * Generates summary insight for an ingested file
 */
export async function generateFileSummary(fileId: string): Promise<void> {
  // Fetch file info
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { id: true, name: true, workspaceId: true },
  })
  if (!file) {
    throw new Error(`File with ID ${fileId} not found`)
  }

  // Fetch all chunks ordered by index
  const chunks = await prisma.chunk.findMany({
    where: { fileId },
    orderBy: { chunkIndex: 'asc' },
    select: { content: true },
  })

  if (chunks.length === 0) {
    console.warn(`File ${fileId} has no text chunks. Skipping summary.`)
    return
  }

  let fullContent = chunks.map((c) => c.content).join('\n')

  // If text is larger than 8000 characters, sample it
  if (fullContent.length > 8000) {
    if (chunks.length > 6) {
      const firstThree = chunks.slice(0, 3)
      const lastThree = chunks.slice(chunks.length - 3)
      const middleChunks = chunks.slice(3, chunks.length - 3)

      // Sample up to 4 middle chunks evenly distributed
      const sampleCount = Math.min(4, middleChunks.length)
      const sampledMiddle: typeof chunks = []
      if (sampleCount > 0) {
        const step = middleChunks.length / sampleCount
        for (let i = 0; i < sampleCount; i++) {
          const index = Math.floor(i * step)
          sampledMiddle.push(middleChunks[index])
        }
      }

      fullContent = [...firstThree, ...sampledMiddle, ...lastThree]
        .map((c) => c.content)
        .join('\n[...]\n')
    }

    if (fullContent.length > 8000) {
      fullContent = fullContent.slice(0, 8000)
    }
  }

  // Call OpenRouter Llama 3.1 8B Instruct
  const openrouter = getOpenRouterClient()
  const systemPrompt = `You are an expert analyst. Summarise the following operational document concisely.
Return a JSON object with exactly these fields:
{
"title": "Brief descriptive title (max 10 words)",
"summary": "2-3 paragraph plain English summary of what this document contains and its key operational relevance",
"keyPoints": ["point 1", "point 2", "point 3", ...],  // 3-6 bullet points
"documentType": "incident report | log file | data export | specification | other",
"timeRange": "time range covered if detectable, else null"
}
Return only valid JSON. No markdown wrapping.`

  const { text } = await generateText({
    model: openrouter('meta-llama/llama-3.1-8b-instruct:free'),
    system: systemPrompt,
    prompt: `Document Content:\n${fullContent}`,
  })

  const parsed = parseModelJson<FileSummaryResponse>(text)

  // Upsert file summary insight
  const existing = await prisma.insight.findFirst({
    where: { fileId, type: 'FILE_SUMMARY' },
  })

  const metadata: Prisma.InputJsonValue = {
    keyPoints: parsed.keyPoints,
    documentType: parsed.documentType,
    timeRange: parsed.timeRange,
  }

  if (existing) {
    await prisma.insight.update({
      where: { id: existing.id },
      data: {
        title: parsed.title,
        content: parsed.summary,
        metadata,
        isStale: false,
      },
    })
  } else {
    await prisma.insight.create({
      data: {
        workspaceId: file.workspaceId,
        fileId,
        type: 'FILE_SUMMARY',
        title: parsed.title,
        content: parsed.summary,
        metadata,
        isStale: false,
      },
    })
  }
}

/**
 * b) extractKeyIssues(workspaceId: string)
 * Identifies primary risks/issues across top 10 READY file summaries
 */
export async function extractKeyIssues(workspaceId: string): Promise<void> {
  // Retrieve 10 most recent READY files
  const files = await prisma.file.findMany({
    where: { workspaceId, status: 'READY' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, name: true },
  })

  if (files.length === 0) {
    console.warn(`No READY files available to extract issues in workspace ${workspaceId}`)
    return
  }

  // Retrieve FILE_SUMMARY insights for these files
  const summaries: string[] = []
  for (const f of files) {
    const insight = await prisma.insight.findFirst({
      where: { fileId: f.id, type: 'FILE_SUMMARY' },
      select: { title: true, content: true, metadata: true },
    })
    if (insight) {
      const meta = insight.metadata as Record<string, unknown> | null
      const bulletPoints = Array.isArray(meta?.keyPoints)
        ? meta.keyPoints.map((p) => `- ${p}`).join('\n')
        : ''
      
      summaries.push(
        `File Name: ${f.name}\nTitle: ${insight.title}\nSummary: ${insight.content}\nKey Bullet Points:\n${bulletPoints}`
      )
    }
  }

  if (summaries.length === 0) {
    console.warn(`No file summaries found to extract issues for workspace ${workspaceId}`)
    return
  }

  const combinedSummaries = summaries.join('\n\n---\n\n')

  // Call OpenRouter
  const openrouter = getOpenRouterClient()
  const systemPrompt = `You are an expert at identifying operational issues and risks.
Analyse the following document summaries from a workspace and identify the top issues, risks, or action items present across the data.
Return JSON:
{
"issues": [
{
"title": "Short issue title",
"severity": "critical | high | medium | low",
"description": "1-2 sentence description",
"sourceFiles": ["filename1", "filename2"],
"suggestedAction": "Recommended next step"
}
]
}
Return only valid JSON. No markdown. Maximum 8 issues.`

  const { text } = await generateText({
    model: openrouter('meta-llama/llama-3.1-8b-instruct:free'),
    system: systemPrompt,
    prompt: `Workspace Document Summaries:\n${combinedSummaries}`,
  })

  const parsed = parseModelJson<KeyIssuesResponse>(text)

  // Generate Markdown content
  let markdown = `### Key Operational Issues & Risks\n\nWe analyzed the recent workspace documents and identified the following operational risks, vulnerabilities, or issues:\n\n`
  parsed.issues.forEach((issue) => {
    const filesStr = issue.sourceFiles.length > 0 ? issue.sourceFiles.join(', ') : 'None specified'
    markdown += `- **${issue.title}** (Severity: \`${issue.severity}\`)\n`
    markdown += `  - *Description*: ${issue.description}\n`
    markdown += `  - *Suggested Action*: ${issue.suggestedAction}\n`
    markdown += `  - *Source Files*: \`${filesStr}\`\n\n`
  })

  // Upsert workspace key issues insight
  const existing = await prisma.insight.findFirst({
    where: { workspaceId, fileId: null, type: 'KEY_ISSUES' },
  })

  if (existing) {
    await prisma.insight.update({
      where: { id: existing.id },
      data: {
        title: 'Workspace Key Issues & Risks',
        content: markdown,
        metadata: { issues: parsed.issues } as unknown as Prisma.InputJsonValue,
        isStale: false,
      },
    })
  } else {
    await prisma.insight.create({
      data: {
        workspaceId,
        fileId: null,
        type: 'KEY_ISSUES',
        title: 'Workspace Key Issues & Risks',
        content: markdown,
        metadata: { issues: parsed.issues } as unknown as Prisma.InputJsonValue,
        isStale: false,
      },
    })
  }
}

/**
 * c) identifyTrends(workspaceId: string)
 * Identifies patterns, repeated anomalies, or trends across top 10 READY file summaries
 */
export async function identifyTrends(workspaceId: string): Promise<void> {
  // Retrieve 10 most recent READY files
  const files = await prisma.file.findMany({
    where: { workspaceId, status: 'READY' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, name: true },
  })

  if (files.length === 0) {
    console.warn(`No READY files available to identify trends in workspace ${workspaceId}`)
    return
  }

  // Retrieve summaries
  const summaries: string[] = []
  for (const f of files) {
    const insight = await prisma.insight.findFirst({
      where: { fileId: f.id, type: 'FILE_SUMMARY' },
      select: { title: true, content: true, metadata: true },
    })
    if (insight) {
      const meta = insight.metadata as Record<string, unknown> | null
      const bulletPoints = Array.isArray(meta?.keyPoints)
        ? meta.keyPoints.map((p) => `- ${p}`).join('\n')
        : ''
      
      summaries.push(
        `File Name: ${f.name}\nTitle: ${insight.title}\nSummary: ${insight.content}\nKey Bullet Points:\n${bulletPoints}`
      )
    }
  }

  if (summaries.length === 0) {
    console.warn(`No file summaries found to identify trends for workspace ${workspaceId}`)
    return
  }

  const combinedSummaries = summaries.join('\n\n---\n\n')

  // Call OpenRouter
  const openrouter = getOpenRouterClient()
  const systemPrompt = `You are an expert at identifying operational trends, anomalies, and patterns over time.
Analyse the following document summaries from a workspace and identify the key trends, repeated patterns, or anomalies observed across these documents.
Return JSON:
{
"trends": [
{
"title": "Trend or Pattern Title",
"category": "pattern | anomaly | trend",
"description": "Detailed explanation of the trend or pattern over time",
"confidence": "high | medium | low",
"sourceFiles": ["filename1", "filename2"]
}
]
}
Return only valid JSON. No markdown. Maximum 8 trends.`

  const { text } = await generateText({
    model: openrouter('meta-llama/llama-3.1-8b-instruct:free'),
    system: systemPrompt,
    prompt: `Workspace Document Summaries:\n${combinedSummaries}`,
  })

  const parsed = parseModelJson<TrendsResponse>(text)

  // Generate Markdown content
  let markdown = `### Workspace Operational Trends & Patterns\n\nWe analyzed the recent workspace documents and identified the following operational trends, recurring patterns, or anomalies:\n\n`
  parsed.trends.forEach((trend) => {
    const filesStr = trend.sourceFiles.length > 0 ? trend.sourceFiles.join(', ') : 'None specified'
    markdown += `- **${trend.title}** (Category: \`${trend.category}\`, Confidence: \`${trend.confidence}\`)\n`
    markdown += `  - *Description*: ${trend.description}\n`
    markdown += `  - *Source Files*: \`${filesStr}\`\n\n`
  })

  // Upsert workspace trends insight
  const existing = await prisma.insight.findFirst({
    where: { workspaceId, fileId: null, type: 'TREND' },
  })

  if (existing) {
    await prisma.insight.update({
      where: { id: existing.id },
      data: {
        title: 'Workspace Operational Trends & Anomalies',
        content: markdown,
        metadata: { trends: parsed.trends } as unknown as Prisma.InputJsonValue,
        isStale: false,
      },
    })
  } else {
    await prisma.insight.create({
      data: {
        workspaceId,
        fileId: null,
        type: 'TREND',
        title: 'Workspace Operational Trends & Anomalies',
        content: markdown,
        metadata: { trends: parsed.trends } as unknown as Prisma.InputJsonValue,
        isStale: false,
      },
    })
  }
}
