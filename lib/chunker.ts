export function chunkText(
  text: string,
  options?: {
    maxTokens?: number   // default 512
    overlap?: number     // default 64, in tokens
  }
): Array<{ content: string; tokenCount: number; chunkIndex: number }> {
  const maxTokens = options?.maxTokens ?? 512
  const overlap = options?.overlap ?? 64

  if (!text.trim()) return []

  // Split text into structural lines first, then decompose to sentences
  const segments: string[] = []
  const rawSegments = text.split(/\n+/)
  for (const rawSeg of rawSegments) {
    if (!rawSeg.trim()) continue
    // Split on dot followed by space (sentence boundaries)
    const sentences = rawSeg.split(/\. /)
    for (let i = 0; i < sentences.length; i++) {
      let sentence = sentences[i].trim()
      if (i < sentences.length - 1 && !sentence.endsWith('.')) {
        sentence += '.'
      }
      if (sentence) {
        segments.push(sentence)
      }
    }
  }

  const chunks: Array<{ content: string; tokenCount: number; chunkIndex: number }> = []
  let currentSegmentGroup: string[] = []
  let currentTokenCount = 0
  let chunkIndex = 0

  const getTokenCount = (str: string) => Math.ceil(str.length / 4)

  for (const segment of segments) {
    const segTokens = getTokenCount(segment)

    // Handle oversized single sentences by splitting on space word-by-word
    if (segTokens > maxTokens) {
      if (currentSegmentGroup.length > 0) {
        const content = currentSegmentGroup.join(' ')
        chunks.push({
          content,
          tokenCount: getTokenCount(content),
          chunkIndex: chunkIndex++,
        })
        currentSegmentGroup = []
        currentTokenCount = 0
      }

      const words = segment.split(/\s+/)
      let wordGroup: string[] = []
      let wordTokens = 0

      for (const word of words) {
        const wTokens = getTokenCount(word + ' ')
        if (wordTokens + wTokens > maxTokens && wordGroup.length > 0) {
          const content = wordGroup.join(' ')
          chunks.push({
            content,
            tokenCount: getTokenCount(content),
            chunkIndex: chunkIndex++,
          })
          
          // Backtrack word group to find the overlap segment
          const overlapGroup: string[] = []
          let overlapTokens = 0
          for (let j = wordGroup.length - 1; j >= 0; j--) {
            const w = wordGroup[j]
            const wt = getTokenCount(w + ' ')
            if (overlapTokens + wt <= overlap) {
              overlapGroup.unshift(w)
              overlapTokens += wt
            } else {
              break
            }
          }
          wordGroup = overlapGroup
          wordTokens = overlapTokens
        }
        wordGroup.push(word)
        wordTokens += wTokens
      }

      if (wordGroup.length > 0) {
        currentSegmentGroup = wordGroup
        currentTokenCount = wordTokens
      }
      continue
    }

    if (currentTokenCount + segTokens > maxTokens) {
      const content = currentSegmentGroup.join(' ')
      chunks.push({
        content,
        tokenCount: getTokenCount(content),
        chunkIndex: chunkIndex++,
      })

      // Backtrack segments to capture overlap context
      const overlapGroup: string[] = []
      let overlapTokens = 0
      for (let j = currentSegmentGroup.length - 1; j >= 0; j--) {
        const s = currentSegmentGroup[j]
        const st = getTokenCount(s)
        if (overlapTokens + st <= overlap) {
          overlapGroup.unshift(s)
          overlapTokens += st
        } else {
          break
        }
      }
      currentSegmentGroup = overlapGroup
      currentTokenCount = overlapTokens
    }

    currentSegmentGroup.push(segment)
    currentTokenCount += segTokens
  }

  if (currentSegmentGroup.length > 0) {
    const content = currentSegmentGroup.join(' ')
    chunks.push({
      content,
      tokenCount: getTokenCount(content),
      chunkIndex: chunkIndex++,
    })
  }

  return chunks
}
