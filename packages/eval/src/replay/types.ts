import type { AdapterRequest, StreamChunk } from '@agentskit/core'

/** One adapter request and the stream chunks recorded for it. */
export interface CassetteEntry {
  request: AdapterRequest
  chunks: StreamChunk[]
}

/** Versioned collection of recorded adapter requests and stream chunks. */
export interface Cassette {
  version: 1
  seed?: string | number
  metadata?: Record<string, unknown>
  entries: CassetteEntry[]
}

/** Optional seed and metadata attached to a newly recorded cassette. */
export interface RecordOptions {
  seed?: string | number
  metadata?: Record<string, unknown>
}

/** Request matching strategy used by a replay adapter. */
export interface ReplayOptions {
  /**
   * Matching strategy when a request does not appear in cassette:
   * - 'strict' (default): throw
   * - 'sequential': return next unused entry regardless of request match
   * - 'loose': ignore context, match by last user message content
   */
  mode?: 'strict' | 'sequential' | 'loose'
}
