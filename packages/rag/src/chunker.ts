export interface ChunkOptions {
  chunkSize: number
  chunkOverlap: number
  split?: (text: string) => string[]
}

// Invalid sizes become +Infinity so the whole text is one chunk and the loop
// always terminates.
function resolveChunkSize(chunkSize: number): number {
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) return Number.POSITIVE_INFINITY
  return Math.floor(chunkSize)
}

// Overlap must stay strictly below chunkSize so start always advances.
function resolveChunkOverlap(chunkOverlap: number, chunkSize: number): number {
  if (!Number.isFinite(chunkOverlap) || chunkOverlap < 0) return 0
  const overlap = Math.floor(chunkOverlap)
  if (!Number.isFinite(chunkSize)) return 0
  return Math.min(overlap, Math.max(0, chunkSize - 1))
}

export function chunkText(text: string, options: ChunkOptions): string[] {
  if (!text) return []

  if (options.split) {
    return options.split(text).filter(chunk => chunk.length > 0)
  }

  const chunkSize = resolveChunkSize(options.chunkSize)
  const chunkOverlap = resolveChunkOverlap(options.chunkOverlap, chunkSize)

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
