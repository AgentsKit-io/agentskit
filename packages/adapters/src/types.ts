import type { AdapterRequest, StreamChunk } from '@agentskit/core'

/**
 * Optional second AbortSignal keeps one-argument callbacks assignable
 * (extra parameters are optional). createAdapter races send against abort
 * and will not start work after pre-abort.
 */
export interface CreateAdapterConfig {
  send: (
    request: AdapterRequest,
    signal?: AbortSignal,
  ) => Promise<ReadableStream | Response>
  parse: (
    stream: ReadableStream,
    response?: Response,
  ) => AsyncIterableIterator<StreamChunk>
  abort?: () => void
}

export interface GenericAdapterConfig {
  send: (
    request: AdapterRequest,
    signal?: AbortSignal,
  ) => Promise<ReadableStream>
}
