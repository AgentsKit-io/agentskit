import { AgentsKitError } from '@agentskit/core'

/**
 * Error codes raised by `@agentskit/rag` loaders and rerankers. Kept local to
 * the package (rather than in core's `ErrorCodes`) because they describe RAG
 * ingestion/rerank I/O, not a core contract surface.
 */
export const RagErrorCodes = {
  /** A loader's HTTP fetch returned a non-OK status. */
  AK_RAG_LOAD_FAILED: 'AK_RAG_LOAD_FAILED',
  /** An optional loader peer SDK (e.g. `@aws-sdk/client-s3`) is not installed. */
  AK_RAG_PEER_MISSING: 'AK_RAG_PEER_MISSING',
  /** A reranker provider call failed. */
  AK_RAG_RERANK_FAILED: 'AK_RAG_RERANK_FAILED',
} as const

export type RagErrorCode = (typeof RagErrorCodes)[keyof typeof RagErrorCodes]

/**
 * Typed error for RAG loaders and rerankers. Extends the core
 * `AgentsKitError` so callers can catch the whole AgentsKit family or narrow
 * on `error.code`.
 */
export class RagError extends AgentsKitError {
  constructor(options: { code: RagErrorCode; message: string; hint?: string; cause?: unknown }) {
    super(options)
    this.name = 'RagError'
  }
}
