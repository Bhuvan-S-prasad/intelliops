export async function parseLog(buffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const content = buffer.toString('utf-8')
  const lines = content.split(/\r?\n/)
  
  // Regex to detect common ISO 8601 timestamps (optionally wrapped in square brackets)
  const tsRegex = /^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]?/

  interface LogLine {
    timestamp: Date | null
    content: string
  }

  const parsedLines: LogLine[] = []
  let lastTimestamp: Date | null = null

  for (const line of lines) {
    if (!line.trim()) continue
    const match = line.match(tsRegex)
    let timestamp: Date | null = null
    if (match) {
      const parsedDate = new Date(match[1])
      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate
        lastTimestamp = parsedDate
      }
    }
    parsedLines.push({
      timestamp: timestamp || lastTimestamp,
      content: line,
    })
  }

  const groups: Map<string, string[]> = new Map()
  
  for (const line of parsedLines) {
    if (line.timestamp) {
      const ms = line.timestamp.getTime()
      // 2-minute window = 120,000 milliseconds
      const windowId = Math.floor(ms / (2 * 60 * 1000)).toString()
      const existing = groups.get(windowId) || []
      existing.push(line.content)
      groups.set(windowId, existing)
    } else {
      const existing = groups.get('no-timestamp') || []
      existing.push(line.content)
      groups.set('no-timestamp', existing)
    }
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'no-timestamp') return 1
    if (b === 'no-timestamp') return -1
    return Number(a) - Number(b)
  })

  const blocks: string[] = []
  for (const key of sortedKeys) {
    const linesInGroup = groups.get(key) || []
    if (linesInGroup.length === 0) continue

    if (key === 'no-timestamp') {
      blocks.push(`[Time: Unknown]\n${linesInGroup.join('\n')}`)
    } else {
      const startMs = Number(key) * 2 * 60 * 1000
      const startDate = new Date(startMs)
      const endDate = new Date(startMs + 2 * 60 * 1000)
      blocks.push(`[Time Window: ${startDate.toISOString()} - ${endDate.toISOString()}]\n${linesInGroup.join('\n')}`)
    }
  }

  const text = blocks.join('\n\n')

  return {
    text,
    metadata: {
      logLineCount: lines.length,
      timeWindowCount: sortedKeys.filter(k => k !== 'no-timestamp').length,
    },
  }
}
