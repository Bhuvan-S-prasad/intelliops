import * as pdf from 'pdf-parse'

type PdfParserFn = (
  dataBuffer: Buffer,
  options?: {
    pagerender?: (pageData: { pageIndex: number; textContent: { items: { str: string }[] } }) => string
    max?: number
    version?: string
  }
) => Promise<{
  text: string
  numpages: number
  info: Record<string, unknown>
}>

export async function parsePdf(buffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const pdfParser = ((pdf as unknown as { default?: PdfParserFn }).default || pdf) as PdfParserFn

  const data = await pdfParser(buffer)
  return {
    text: data.text || '',
    metadata: {
      pageCount: data.numpages || 1,
      info: data.info || {},
    },
  }
}
