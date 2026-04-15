import type { AdapterRequest, Message, StreamChunk, StreamSource } from '@agentskit/core'

export function toProviderMessages(messages: Message[]) {
  return messages.map(message => ({
    role: message.role,
    content: message.content,
  }))
}

export async function* readSSELines(stream: ReadableStream): AsyncIterableIterator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data) yield data
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* readNDJSONLines(stream: ReadableStream): AsyncIterableIterator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) yield trimmed
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* parseOpenAIStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>()

  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') {
      for (const [, tc] of pendingToolCalls) {
        yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
      }
      pendingToolCalls.clear()
      yield { type: 'done' }
      return
    }

    try {
      const event = JSON.parse(data)
      const delta = event.choices?.[0]?.delta

      if (typeof delta?.content === 'string') {
        yield { type: 'text', content: delta.content }
      }

      if (Array.isArray(delta?.tool_calls)) {
        for (const toolCall of delta.tool_calls) {
          const index: number = toolCall.index ?? 0
          const existing = pendingToolCalls.get(index)

          if (toolCall?.function?.name) {
            // First chunk for this tool call — store it
            pendingToolCalls.set(index, {
              id: toolCall.id ?? existing?.id ?? `tool-${index}-${Date.now()}`,
              name: toolCall.function.name,
              args: (existing?.args ?? '') + (toolCall.function.arguments ?? ''),
            })
          } else if (existing && toolCall?.function?.arguments) {
            // Subsequent chunk — accumulate arguments
            existing.args += toolCall.function.arguments
          }
        }
      }
    } catch {
      // Ignore malformed events.
    }
  }

  // Flush any remaining tool calls if stream ends without [DONE]
  for (const [, tc] of pendingToolCalls) {
    yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
  }
  pendingToolCalls.clear()

  yield { type: 'done' }
}

export async function* parseAnthropicStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>()

  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') continue

    try {
      const event = JSON.parse(data)
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta?.text) {
        yield { type: 'text', content: event.delta.text }
      } else if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
        const index: number = event.index ?? 0
        const existing = pendingToolCalls.get(index)
        if (existing) {
          existing.args += event.delta.partial_json ?? ''
        }
      } else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        const index: number = event.index ?? 0
        pendingToolCalls.set(index, {
          id: event.content_block.id,
          name: event.content_block.name,
          args: '',
        })
      } else if (event.type === 'content_block_stop') {
        const index: number = event.index ?? 0
        const tc = pendingToolCalls.get(index)
        if (tc) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: tc.id,
              name: tc.name,
              args: tc.args || '{}',
            },
          }
          pendingToolCalls.delete(index)
        }
      } else if (event.type === 'message_stop') {
        // Flush any remaining tool calls
        for (const [, tc] of pendingToolCalls) {
          yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
        }
        pendingToolCalls.clear()
        yield { type: 'done' }
        return
      }
    } catch {
      // Ignore malformed events.
    }
  }

  // Flush remaining if stream ends without message_stop
  for (const [, tc] of pendingToolCalls) {
    yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
  }
  pendingToolCalls.clear()

  yield { type: 'done' }
}

export async function* parseGeminiStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  for await (const data of readSSELines(stream)) {
    try {
      const event = JSON.parse(data)
      const parts = event.candidates?.[0]?.content?.parts
      if (!Array.isArray(parts)) continue

      for (const part of parts) {
        if (typeof part.text === 'string' && part.text) {
          yield { type: 'text', content: part.text }
        } else if (part.functionCall) {
          const fc = part.functionCall
          yield {
            type: 'tool_call',
            toolCall: {
              id: fc.id ?? `${fc.name}-${Date.now()}`,
              name: fc.name,
              args: JSON.stringify(fc.args ?? {}),
            },
          }
        }
      }
    } catch {
      // Ignore malformed events.
    }
  }

  yield { type: 'done' }
}

export async function* parseOllamaStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  for await (const data of readNDJSONLines(stream)) {
    try {
      const event = JSON.parse(data)
      if (event.message?.content) {
        yield { type: 'text', content: event.message.content }
      }
      if (Array.isArray(event.message?.tool_calls)) {
        for (const tc of event.message.tool_calls) {
          if (tc?.function?.name) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: tc.id ?? `${tc.function.name}-${Date.now()}`,
                name: tc.function.name,
                args: typeof tc.function.arguments === 'string'
                  ? tc.function.arguments
                  : JSON.stringify(tc.function.arguments ?? {}),
              },
            }
          }
        }
      }
      if (event.done) {
        yield { type: 'done' }
        return
      }
    } catch {
      // Ignore malformed events.
    }
  }

  yield { type: 'done' }
}

/**
 * Retry knobs for adapter fetches. Tunable per call to createStreamSource.
 *
 * Default behavior:
 *   - 3 attempts total (1 initial + 2 retries)
 *   - exponential backoff: 500ms, 1000ms, 2000ms ... (capped at maxDelayMs)
 *   - full jitter on each delay
 *   - retry on HTTP 408, 429, 500, 502, 503, 504
 *   - retry on network errors (fetch throws)
 *   - DO NOT retry on 4xx other than 408/429 (those are bad requests / auth)
 *   - retries only the initial fetch — never mid-stream
 *   - respects Retry-After header when present
 */
export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  jitter?: boolean
  retryOn?: (info: { error?: unknown; response?: Response; attempt: number }) => boolean
  /** Hook for tests + logging. Called after every failed attempt. */
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void
  /** Sleep override for tests. Defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_RETRY: Required<Omit<RetryOptions, 'onRetry' | 'sleep' | 'retryOn'>> & {
  retryOn: NonNullable<RetryOptions['retryOn']>
} = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  jitter: true,
  retryOn: ({ error, response }) => {
    if (response) {
      return [408, 429, 500, 502, 503, 504].includes(response.status)
    }
    if (error instanceof DOMException && error.name === 'AbortError') return false
    // Network error: TypeError from fetch, AbortError from upstream timeout, etc.
    return true
  },
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function computeDelay(attempt: number, opts: Required<Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs' | 'jitter'>>): number {
  const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(2, attempt - 1))
  if (!opts.jitter) return exp
  return Math.floor(Math.random() * exp)
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  if (!Number.isNaN(n)) return n * 1000
  const date = Date.parse(value)
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
  return undefined
}

/**
 * Run a fetch with retries on transient failures. Returns the final
 * Response (whether successful or not — caller decides), or throws if
 * the AbortSignal fires or all attempts fail with a thrown error.
 */
export async function fetchWithRetry(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  signal: AbortSignal,
  retryOpt: RetryOptions = {},
): Promise<Response> {
  const opts = {
    ...DEFAULT_RETRY,
    ...retryOpt,
  }
  const sleep = retryOpt.sleep ?? defaultSleep
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    try {
      const response = await doFetch(signal)

      // Success or non-retryable failure → return.
      if (response.ok) return response
      if (attempt >= opts.maxAttempts || !opts.retryOn({ response, attempt })) {
        return response
      }

      const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'))
      const delay = retryAfterMs ?? computeDelay(attempt, opts)
      retryOpt.onRetry?.({ attempt, delayMs: delay, reason: `HTTP ${response.status}` })
      await sleep(delay)
      // Drain the body so the connection can be reused.
      response.body?.cancel().catch(() => {})
    } catch (err) {
      lastError = err
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      if (attempt >= opts.maxAttempts || !opts.retryOn({ error: err, attempt })) throw err

      const delay = computeDelay(attempt, opts)
      retryOpt.onRetry?.({ attempt, delayMs: delay, reason: (err as Error).message })
      await sleep(delay)
    }
  }

  // Unreachable, but the TS narrowing needs it.
  throw lastError ?? new Error('fetchWithRetry: exhausted attempts')
}

export function createStreamSource(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  parse: (stream: ReadableStream) => AsyncIterableIterator<StreamChunk>,
  errorLabel: string,
  retry?: RetryOptions,
): StreamSource {
  let abortController: AbortController | null = new AbortController()

  return {
    stream: async function* (): AsyncIterableIterator<StreamChunk> {
      try {
        const response = await fetchWithRetry(doFetch, abortController!.signal, retry ?? {})

        if (!response.ok || !response.body) {
          yield { type: 'error', content: `${errorLabel} error: ${response.status}` }
          return
        }

        yield* parse(response.body)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        yield {
          type: 'error',
          content: err instanceof Error ? err.message : String(err),
        }
      }
    },
    abort: () => {
      abortController?.abort()
      abortController = null
    },
  }
}
