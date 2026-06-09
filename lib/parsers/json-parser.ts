function flattenObject(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}

  if (obj !== null && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = prefix ? `${prefix}.${index}` : `${index}`
        if (item !== null && typeof item === 'object') {
          Object.assign(result, flattenObject(item, path))
        } else {
          result[path] = String(item)
        }
      })
    } else {
      const record = obj as Record<string, unknown>
      for (const key in record) {
        if (Object.prototype.hasOwnProperty.call(record, key)) {
          const val = record[key]
          const path = prefix ? `${prefix}.${key}` : key

          if (val !== null && typeof val === 'object') {
            Object.assign(result, flattenObject(val, path))
          } else {
            result[path] = String(val)
          }
        }
      }
    }
  }

  return result
}

export async function parseJson(buffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const parsed = JSON.parse(buffer.toString('utf-8'))
  const flattened = flattenObject(parsed)
  
  const entries = Object.entries(flattened)
  const lines = entries.map(([path, value]) => `${path}: ${value}`)
  
  // Group into blocks of 100 lines
  const lineGroups: string[] = []
  const groupSize = 100
  for (let i = 0; i < lines.length; i += groupSize) {
    lineGroups.push(lines.slice(i, i + groupSize).join('\n'))
  }
  
  const text = lineGroups.join('\n\n')

  return {
    text,
    metadata: {
      keyCount: entries.length,
    },
  }
}
