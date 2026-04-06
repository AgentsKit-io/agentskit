export interface ChunkOptions {
  chunkSize: number
  chunkOverlap: number
  split?: (text: string) => string[]
}

export function chunkText(text: string, options: ChunkOptions): string[] {
  if (!text) return []

  if (options.split) {
    return options.split(text).filter(chunk => chunk.length > 0)
  }

  const { chunkSize, chunkOverlap } = options

  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)

    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end)
      if (boundary > start) {
        end = boundary
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    if (end >= text.length) break

    const advance = end - start - chunkOverlap
    start += Math.max(advance, 1)
  }

  return chunks
}
