import { ConfigError, ErrorCodes, type AdapterFactory, type StreamChunk } from '@agentskit/core'
import { defensiveSnapshot } from './clone'
import type { Cassette } from './types'

export interface ReplayAgainstResult {
  turn: number
  input: string
  recorded: { text: string; chunkCount: number }
  candidate: { text: string; chunkCount: number; error?: string }
  /** Rough similarity on the concatenated text output (Jaccard over tokens). */
  similarity: number
}

export interface ReplayAgainstOptions {
  /** Max concurrent candidate turns. Default 1 (sequential, safer). */
  concurrency?: number
  /** Stop after N turns. Default: replay every entry. */
  limit?: number
}

function textOf(chunks: StreamChunk[]): string {
  let out = ''
  for (const c of chunks) {
    if (c.type === 'text' && typeof c.content === 'string') out += c.content
  }
  return out
}

function jaccard(a: string, b: string): number {
  const tok = (s: string): Set<string> =>
    new Set(
      s
        .toLowerCase()
        .split(/\W+/)
        .filter(t => t.length > 0),
    )
  const A = tok(a)
  const B = tok(b)
  if (A.size === 0 && B.size === 0) return 1
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

function assertNonNegativeInt(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${name} must be a non-negative finite integer`,
    })
  }
  return value
}

/**
 * Re-run every recorded turn in `cassette` through a different
 * `candidate` adapter and return a per-turn comparison. Fast way to
 * A/B a production trace against a cheaper or newer model without
 * touching real users.
 */
export async function replayAgainst(
  cassette: Cassette,
  candidate: AdapterFactory,
  options: ReplayAgainstOptions = {},
): Promise<ReplayAgainstResult[]> {
  const limit =
    options.limit !== undefined
      ? assertNonNegativeInt(options.limit, 'limit')
      : cassette.entries.length
  const concurrencyRaw =
    options.concurrency !== undefined
      ? assertNonNegativeInt(options.concurrency, 'concurrency')
      : 1
  const concurrency = Math.max(1, concurrencyRaw)

  const entries = cassette.entries.slice(0, limit).map(e => defensiveSnapshot(e))

  const runOne = async (entry: Cassette['entries'][number], turn: number): Promise<ReplayAgainstResult> => {
    const recordedText = textOf(entry.chunks)
    const input =
      entry.request.messages.filter(m => m.role === 'user').slice(-1)[0]?.content ?? ''
    let candidateChunks: StreamChunk[] = []
    let error: string | undefined
    try {
      const source = candidate.createSource(defensiveSnapshot(entry.request))
      for await (const c of source.stream()) candidateChunks.push(c)
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
    const candidateText = textOf(candidateChunks)
    return {
      turn,
      input,
      recorded: { text: recordedText, chunkCount: entry.chunks.length },
      candidate: { text: candidateText, chunkCount: candidateChunks.length, error },
      similarity: jaccard(recordedText, candidateText),
    }
  }

  const results: ReplayAgainstResult[] = new Array(entries.length)
  let next = 0
  const workers: Promise<void>[] = []
  const launch = async (): Promise<void> => {
    while (next < entries.length) {
      const idx = next++
      results[idx] = await runOne(entries[idx]!, idx)
    }
  }
  for (let i = 0; i < Math.min(concurrency, entries.length); i++) workers.push(launch())
  await Promise.all(workers)
  return results
}

/**
 * Summary metric over a list of `replayAgainst` turns.
 */
export function summarizeReplay(turns: ReplayAgainstResult[]): {
  avgSimilarity: number
  minSimilarity: number
  errorCount: number
  turnCount: number
} {
  if (turns.length === 0) {
    return { avgSimilarity: 0, minSimilarity: 0, errorCount: 0, turnCount: 0 }
  }
  let sum = 0
  let min = 1
  let errors = 0
  for (const t of turns) {
    sum += t.similarity
    if (t.similarity < min) min = t.similarity
    if (t.candidate.error) errors++
  }
  return {
    avgSimilarity: sum / turns.length,
    minSimilarity: min,
    errorCount: errors,
    turnCount: turns.length,
  }
}
