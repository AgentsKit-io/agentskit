import { createParser, type EventSourceMessage } from 'eventsource-parser'
import { NetError, NetErrorCodes } from './errors'

/** Parsed Server-Sent Event fields emitted by {@link parseSSE}. */
export type SSEEvent = EventSourceMessage

/** Cancellation and event-size settings for {@link parseSSE}. */
export interface ParseSSEOptions {
  signal?: AbortSignal
  /** Cap for a single unfinished event, protecting against endless lines. Default 1 MiB. */
  maxEventBytes?: number
}

/**
 * Parse a Server-Sent Events byte stream into events, per the WHATWG spec
 * (via `eventsource-parser`): `data:` with or without a space, multi-line
 * data joined with `\n`, CRLF/CR/LF line endings, comments and `retry:`.
 * An event cut off before its terminating blank line is dropped, as in
 * browsers' `EventSource`.
 *
 * @param stream Byte stream containing SSE text.
 * @param options Optional abort signal and maximum buffered event size.
 * @returns An async iterator of complete parsed events.
 * @throws {NetError} With code AK_NET_SSE_PARSE_FAILED when parsing fails.
 * @example
 * ```ts
 * import { parseSSE } from '@agentskit/net'
 *
 * const stream = new Response('data: ready\\n\\n').body!
 * for await (const event of parseSSE(stream)) {
 *   console.log(event.data)
 * }
 * ```
 */
export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
  options: ParseSSEOptions = {},
): AsyncGenerator<SSEEvent, void, undefined> {
  const queue: SSEEvent[] = []
  let failure: NetError | undefined
  const parser = createParser({
    maxBufferSize: options.maxEventBytes ?? 1024 * 1024,
    onEvent: event => queue.push(event),
    onError: error => {
      failure = new NetError({ code: NetErrorCodes.AK_NET_SSE_PARSE_FAILED, message: error.message, cause: error })
    },
  })
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const onAbort = () => void reader.cancel(options.signal?.reason).catch(() => {})
  options.signal?.addEventListener('abort', onAbort, { once: true })
  try {
    for (;;) {
      if (options.signal?.aborted) throw options.signal.reason
      const { done, value } = await reader.read()
      if (done) {
        // Per spec, an event cut off before its blank line is not dispatched.
        parser.feed(decoder.decode())
      } else {
        parser.feed(decoder.decode(value, { stream: true }))
      }
      if (failure) throw failure
      while (queue.length > 0) yield queue.shift()!
      if (done) return
    }
  } finally {
    options.signal?.removeEventListener('abort', onAbort)
    reader.releaseLock()
  }
}

/** Parse the SSE body of a `fetch` response. */
export function parseSSEResponse(response: Response, options: ParseSSEOptions = {}): AsyncGenerator<SSEEvent, void, undefined> {
  if (!response.body) return (async function* () {})()
  return parseSSE(response.body, options)
}
