import { ConfigError, ErrorCodes } from '@agentskit/core'
import type {
  AdapterFactory,
  AdapterRequest,
  StreamChunk,
  StreamSource,
} from '@agentskit/core'
import { abortableSleep, adapterErrorChunk, isAbortError } from './stream-errors'

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
      const controller = new AbortController()
      let myCall: number | undefined
      let cancelled = false

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (cancelled || controller.signal.aborted) return
          try {
            if (myCall === undefined) {
              myCall = callIndex++
              history?.push(request)
            }
            const chunks = resolve(response, myCall, request)

            for (const chunk of chunks) {
              if (cancelled || controller.signal.aborted) return
              if (delayMs > 0) {
                await abortableSleep(delayMs, controller.signal, ms => new Promise(resolveTimer => setTimeout(resolveTimer, ms)))
              }
              if (cancelled || controller.signal.aborted) return
              if (chunk.type === 'error' && !(chunk.metadata?.error instanceof Error)) {
                const normalized = adapterErrorChunk(
                  chunk.content ?? 'Mock adapter error',
                  { cause: chunk.metadata?.error },
                )
                yield {
                  ...chunk,
                  metadata: { ...chunk.metadata, ...normalized.metadata },
                }
                return
              }
              yield chunk
              if (chunk.type === 'done' || chunk.type === 'error') return
            }

            yield { type: 'done' }
          } catch (error) {
            if (cancelled || controller.signal.aborted || isAbortError(error)) return
            const message = error instanceof Error ? error.message : String(error)
            yield adapterErrorChunk(message, { cause: error })
          }
        },
        abort: () => {
          cancelled = true
          controller.abort()
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
    capabilities: inner.capabilities,
    createSource: (request: AdapterRequest): StreamSource => {
      let innerSource: StreamSource | undefined
      const captured: StreamChunk[] = []
      let aborted = false

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (aborted) return
          const recordedAt = new Date().toISOString()
          try {
            innerSource = inner.createSource(request)
            for await (const chunk of innerSource.stream()) {
              if (aborted) return
              captured.push(chunk)
              yield chunk
              if (chunk.type === 'done' || chunk.type === 'error') return
            }
            const errorChunk = adapterErrorChunk('Recorded adapter ended without a terminal chunk')
            captured.push(errorChunk)
            yield errorChunk
          } catch (error) {
            if (aborted || isAbortError(error)) return
            const message = error instanceof Error ? error.message : String(error)
            const errorChunk = adapterErrorChunk(message, { cause: error })
            captured.push(errorChunk)
            yield errorChunk
          } finally {
            try {
              await sink.push({ recordedAt, request, chunks: captured })
            } catch {
              // Recording must not corrupt the wrapped adapter stream.
            }
          }
        },
        abort: () => {
          aborted = true
          innerSource?.abort()
        },
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
