import type { AdapterRequest, StreamChunk } from '@agentskit/core'

export interface CassetteEntry {
  request: AdapterRequest
  chunks: StreamChunk[]
}

export interface Cassette {
  version: 1
  seed?: string | number
  metadata?: Record<string, unknown>
  entries: CassetteEntry[]
}

export interface RecordOptions {
  seed?: string | number
  metadata?: Record<string, unknown>
}

export interface ReplayOptions {
  /**
   * Matching strategy when a request does not appear in cassette:
   * - 'strict' (default): throw
   * - 'sequential': return next unused entry regardless of request match
   * - 'loose': ignore context, match by last user message content
   */
  mode?: 'strict' | 'sequential' | 'loose'
}
