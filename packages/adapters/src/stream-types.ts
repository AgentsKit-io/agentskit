import type { StreamChunk } from '@agentskit/core'

/**
 * Stream parser used by createStreamSource.
 * Second argument is optional for backward compatibility; createStreamSource
 * passes the Response so parsers (e.g. vercel AI UI Message Stream) can
 * inspect response headers.
 */
export type StreamParser = (
  stream: ReadableStream,
  response?: Response,
) => AsyncIterableIterator<StreamChunk>
