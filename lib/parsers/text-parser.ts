export async function parseText(buffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const text = buffer.toString('utf-8')
  return {
    text,
    metadata: {},
  }
}
