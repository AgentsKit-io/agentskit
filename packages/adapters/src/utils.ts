import type { AdapterRequest, Message, StreamChunk, StreamSource } from '@agentskit/core'
import { readNDJSONLines, readSSELines } from './stream-lines'

export { parseOpenAIStream } from './openai-stream'
export { readNDJSONLines, readSSELines } from './stream-lines'

export function toProviderMessages(messages: Message[]) {
  // Track which tool_call ids were declared by preceding assistant turns so
  // we can drop orphan tool messages — the OpenAI Chat Completions API
  // rejects a tool message whose tool_call_id isn't bound to a previous
  // assistant message.
  const knownToolCallIds = new Set<string>()
  const output: Array<Record<string, unknown>> = []

  for (const message of messages) {
    if (message.role === 'tool') {
      const id = message.toolCallId
      // Orphan (no id, or id not declared) — skip; it would 400 the API.
      if (!id || !knownToolCallIds.has(id)) continue
      output.push({
        role: 'tool' as const,
        content: message.content,
        tool_call_id: id,
      })
      continue
    }

    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      for (const tc of message.toolCalls) knownToolCallIds.add(tc.id)
      output.push({
        role: 'assistant' as const,
        content: message.content || null,
        tool_calls: message.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args ?? {}),
          },
        })),
      })
      continue
    }

    // Skip assistant messages with no content AND no tool calls. These
    // happen when a turn was interrupted (Ctrl+C, crashed adapter, etc.)
    // and the placeholder assistant message never received content —
    // sending `{role:'assistant', content:''}` back to the provider either
    // 400s or confuses the model into silence on the next turn.
    if (message.role === 'assistant' && !message.content) continue

    output.push({ role: message.role, content: message.content })
  }

  return output
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
      } else if (event.type === 'message_delta' && event.usage) {
        // Anthropic emits output_tokens on `message_delta`, input_tokens on
        // `message_start`. We publish whatever we have on the delta — the
        // consumer accumulates across turns.
        yield {
          type: 'usage',
          usage: {
            promptTokens: event.usage.input_tokens ?? 0,
            completionTokens: event.usage.output_tokens ?? 0,
            totalTokens: (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0),
          },
        }
      } else if (event.type === 'message_start' && event.message?.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: event.message.usage.input_tokens ?? 0,
            completionTokens: 0,
            totalTokens: event.message.usage.input_tokens ?? 0,
          },
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

      if (event.usageMetadata) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: event.usageMetadata.promptTokenCount ?? 0,
            completionTokens: event.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: event.usageMetadata.totalTokenCount ?? 0,
          },
        }
      }

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
        if (typeof event.prompt_eval_count === 'number' || typeof event.eval_count === 'number') {
          const promptTokens = event.prompt_eval_count ?? 0
          const completionTokens = event.eval_count ?? 0
          yield {
            type: 'usage',
            usage: {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            },
          }
        }
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
      const controller = abortController
      if (!controller) return
      try {
        const response = await fetchWithRetry(doFetch, controller.signal, retry ?? {})

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

/**
 * Chunk-splitter that turns one large string into N streamable text chunks.
 * Useful when a provider returns the full response in one shot and you
 * want to feed it to a UI that expects streaming.
 *
 * Default splits by whitespace boundaries with a target chunk size of ~32
 * characters.
 */
export function chunkText(text: string, targetSize = 32): string[] {
  if (text.length <= targetSize) return [text]
  const out: string[] = []
  let i = 0
  while (i < text.length) {
    let end = Math.min(text.length, i + targetSize)
    // Prefer to cut on whitespace within the next few chars
    if (end < text.length) {
      const nextSpace = text.indexOf(' ', end)
      if (nextSpace !== -1 && nextSpace - end <= 8) end = nextSpace + 1
    }
    out.push(text.slice(i, end))
    i = end
  }
  return out
}

/**
 * Build a StreamSource from a non-streaming fetch. The adapter is
 * auto-completing: it fetches once, then yields the text as a sequence
 * of chunks so UIs see the same streaming shape they'd see from a
 * native streaming provider.
 *
 * Use this when you're wiring a provider that only has a non-streaming
 * endpoint but you want consumers (useChat, the runtime) to get
 * identical ergonomics.
 */
export function simulateStream(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  extractText: (response: Response) => Promise<string>,
  errorLabel: string,
  options: { chunkSize?: number; delayMs?: number; retry?: RetryOptions } = {},
): StreamSource {
  const { chunkSize = 32, delayMs = 8, retry } = options
  let abortController: AbortController | null = new AbortController()

  return {
    stream: async function* (): AsyncIterableIterator<StreamChunk> {
      const controller = abortController
      if (!controller) return
      try {
        const response = await fetchWithRetry(doFetch, controller.signal, retry ?? {})

        if (!response.ok) {
          yield { type: 'error', content: `${errorLabel} error: ${response.status}` }
          return
        }

        const text = await extractText(response)
        const chunks = chunkText(text, chunkSize)
        for (const chunk of chunks) {
          if (abortController === null) return
          if (delayMs > 0) {
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(resolve, delayMs)
              controller.signal.addEventListener(
                'abort',
                () => {
                  clearTimeout(timer)
                  reject(new DOMException('Aborted', 'AbortError'))
                },
                { once: true },
              )
            })
          }
          yield { type: 'text', content: chunk }
        }
        yield { type: 'done' }
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
