import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export interface ParsedImage {
  text: string
  metadata: {
    description: string
    imageType: string
    contentType: string
    hasText: boolean
    hasCharts: boolean
    hasCode: boolean
  }
}

export async function parseImage(buffer: Buffer, mimeType: string): Promise<ParsedImage> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not defined')
  }

  // Convert buffer to base64
  const base64Image = buffer.toString('base64')

  // Determine image type from mime type
  let imageType = 'image/jpeg'
  if (mimeType.includes('png')) imageType = 'image/png'
  else if (mimeType.includes('gif')) imageType = 'image/gif'
  else if (mimeType.includes('webp')) imageType = 'image/webp'

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })

  try {
    const { text } = await generateText({
      model: openrouter.chat('nvidia/nemotron-3.5-content-safety:free'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: base64Image,
              mediaType: imageType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            },
            {
              type: 'text',
              text: `Analyze this image in detail. Provide:
1. A comprehensive description of what you see
2. Any text visible in the image
3. Key objects, people, or elements
4. The context or purpose of the image
5. Any data, charts, diagrams, or code visible

Format your response as structured text with clear sections.`,
            },
          ],
        },
      ],
    })

    // Detect content types
    const lowerText = text.toLowerCase()
    const hasText = /text|writing|caption|label|heading/.test(lowerText)
    const hasCharts = /chart|graph|diagram|plot|visualization/.test(lowerText)
    const hasCode = /code|script|programming|syntax|function|class/.test(lowerText)

    return {
      text,
      metadata: {
        description: text.split('\n')[0] || 'Image analysis',
        imageType: imageType,
        contentType: mimeType,
        hasText,
        hasCharts,
        hasCode,
      },
    }
  } catch (err) {
    throw new Error(`Failed to analyze image: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
