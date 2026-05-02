import { ConfigError, ErrorCodes } from '@agentskit/core'
import type {
  AdapterFactory,
  AdapterRequest,
  StreamChunk,
  StreamSource,
} from '@agentskit/core'

export type MockResponse = StreamChunk[] | ((request: AdapterRequest) => StreamChunk[])

export interface MockAdapterOptions {
  /**
   * Static chunks, a request-aware function, or a sequence of responses
   * (the i-th call returns the i-th item, looping when exhausted).
   */
  response: MockResponse | MockResponse[]
  /** ms between yielded chunks. Default 0 (synchronous). */
  delayMs?: number
  /** Track every request the adapter received. Useful for assertions. */
  history?: AdapterRequest[]
}

/**
 * A deterministic adapter for tests, demos, and dry-run experiments.
 *
 * Conforms to ADR 0001 — Adapter contract:
 * - createSource is pure (A1) — no work until stream() runs
 * - Always emits a terminal chunk (A3)
 * - abort() is safe (A6)
 * - Does not mutate input messages (A7)
 *
 * Examples:
 *
 *   // Static
 *   const adapter = mockAdapter({
 *     response: [
 *       { type: 'text', content: 'Hello!' },
 *       { type: 'done' },
 *     ],
 *   })
 *
 *   // Request-aware
 *   const adapter = mockAdapter({
 *     response: req => {
 *       const last = req.messages[req.messages.length - 1]?.content ?? ''
 *       return [
 *         { type: 'text', content: 'Echo: ' + last },
 *         { type: 'done' },
 *       ]
 *     },
 *   })
 *
 *   // Sequenced — different output each call
 *   const adapter = mockAdapter({
 *     response: [
 *       [{ type: 'text', content: 'first' }, { type: 'done' }],
 *       [{ type: 'text', content: 'second' }, { type: 'done' }],
 *     ],
 *   })
 */
export function mockAdapter(options: MockAdapterOptions): AdapterFactory {
  const { response, delayMs = 0, history } = options
  let callIndex = 0

  return {
    capabilities: {
      streaming: true,
      tools: true,
      reasoning: true,
      multiModal: true,
      usage: true,
    },
    createSource: (request: AdapterRequest): StreamSource => {
      history?.push(request)
      const myCall = callIndex++
      let cancelled = false

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          const chunks = resolve(response, myCall, request)
          let endedExplicitly = false

          for (const chunk of chunks) {
            if (cancelled) return
            if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
            yield chunk
            if (chunk.type === 'done' || chunk.type === 'error') {
              endedExplicitly = true
            }
          }

          // ADR 0001 A3 — every stream ends with a terminal chunk.
          if (!endedExplicitly) yield { type: 'done' }
        },
        abort: () => {
          cancelled = true
        },
      }
    },
  }
}

function resolve(
  response: MockResponse | MockResponse[],
  callIndex: number,
  request: AdapterRequest,
): StreamChunk[] {
  if (Array.isArray(response) && response.length > 0 && Array.isArray(response[0])) {
    // Sequenced responses
    const sequence = response as StreamChunk[][]
    const item = sequence[callIndex % sequence.length]
    return item
  }
  if (Array.isArray(response) && response.length > 0 && typeof response[0] === 'function') {
    // Sequenced functions
    const sequence = response as Array<(req: AdapterRequest) => StreamChunk[]>
    return sequence[callIndex % sequence.length](request)
  }
  if (typeof response === 'function') {
    return response(request)
  }
  return response as StreamChunk[]
}

// ============================================================================
// Recording / replay
// ============================================================================

export interface RecordedTurn {
  /** ISO timestamp when this turn was recorded. */
  recordedAt: string
  /** The request that produced this turn. */
  request: AdapterRequest
  /** Every chunk yielded by the wrapped adapter. */
  chunks: StreamChunk[]
}

export type RecordingFixture = RecordedTurn[]

export interface RecordingSink {
  push(turn: RecordedTurn): void | Promise<void>
}

/**
 * Wrap a real adapter so every turn is captured to a sink. Use this in
 * dev to build up a fixture, then replay with replayAdapter() in tests.
 */
export function recordingAdapter(
  inner: AdapterFactory,
  sink: RecordingSink,
): AdapterFactory {
  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const innerSource = inner.createSource(request)
      const captured: StreamChunk[] = []
      const recordedAt = new Date().toISOString()

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          try {
            for await (const chunk of innerSource.stream()) {
              captured.push(chunk)
              yield chunk
            }
          } finally {
            await sink.push({ recordedAt, request, chunks: captured })
          }
        },
        abort: () => innerSource.abort(),
      }
    },
  }
}

/**
 * In-memory recording sink — useful for tests and ephemeral capture.
 */
export function inMemorySink(): RecordingSink & { fixture: RecordingFixture } {
  const fixture: RecordingFixture = []
  return {
    fixture,
    push(turn) {
      fixture.push(turn)
    },
  }
}

/**
 * Replay an adapter from a recorded fixture. Each turn maps 1:1 to a
 * recorded entry by index — call N replays fixture[N % fixture.length].
 */
export function replayAdapter(fixture: RecordingFixture): AdapterFactory {
  if (fixture.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'replayAdapter: fixture is empty',
      hint: 'Pass a non-empty fixture; record one with recordingAdapter() first.',
    })
  }
  return mockAdapter({
    response: fixture.map(turn => turn.chunks),
  })
}
