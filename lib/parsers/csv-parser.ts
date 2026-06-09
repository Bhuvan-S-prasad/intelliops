import Papa from 'papaparse'

export async function parseCsv(buffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const csvText = buffer.toString('utf-8')
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const rows = parsed.data as Record<string, unknown>[]
  const columns = parsed.meta.fields || []

  const rowGroups: string[] = []
  const groupSize = 50

  for (let i = 0; i < rows.length; i += groupSize) {
    const groupRows = rows.slice(i, i + groupSize)
    const groupText = groupRows
      .map((row, index) => {
        const rowNum = i + index + 1
        const fields = Object.entries(row)
          .map(([key, val]) => `${key}=${val}`)
          .join(', ')
        return `Row ${rowNum}: ${fields}`
      })
      .join('\n')
    rowGroups.push(groupText)
  }

  const text = rowGroups.join('\n\n')

  return {
    text,
    metadata: {
      columns,
      rowCount: rows.length,
    },
  }
}
