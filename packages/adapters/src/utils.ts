import type { Message, StreamChunk, StreamSource } from '@agentskit/core'
import { readNDJSONLines, readSSELines } from './stream-lines'
import {
  abortableSleep,
  adapterErrorChunk,
  cancelBody,
  isAbortError,
  parseCompleteToolArgs,
} from './stream-errors'

export { parseOpenAIStream } from './openai-stream'
export { readNDJSONLines, readSSELines } from './stream-lines'
export type { StreamParser } from './stream-types'

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
  let sawMessageStop = false

  const emitToolCall = function* (
    tc: { id: string; name: string; args: string },
  ): Generator<StreamChunk, boolean> {
    const parsed = parseCompleteToolArgs(tc.args)
    if (!parsed.ok) {
      yield {
        type: 'error',
        content: parsed.error.message,
        metadata: { error: parsed.error },
      }
      return false
    }
    yield {
      type: 'tool_call',
      toolCall: { id: tc.id, name: tc.name, args: parsed.args },
    }
    return true
  }

  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') continue

    try {
      const event = JSON.parse(data) as {
        type?: string
        index?: number
        delta?: { type?: string; text?: string; partial_json?: string }
        content_block?: { type?: string; id?: string; name?: string }
        usage?: { input_tokens?: number; output_tokens?: number }
        message?: { usage?: { input_tokens?: number } }
        error?: { type?: string; message?: string }
      }

      if (event.type === 'error') {
        const msg =
          event.error?.message ??
          event.error?.type ??
          'Anthropic stream error'
        yield adapterErrorChunk(String(msg))
        return
      }

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
          id: event.content_block.id ?? `tool-${index}`,
          name: event.content_block.name ?? 'unknown',
          args: '',
        })
      } else if (event.type === 'content_block_stop') {
        const index: number = event.index ?? 0
        const tc = pendingToolCalls.get(index)
        if (tc) {
          if (!(yield* emitToolCall(tc))) {
            pendingToolCalls.clear()
            return
          }
          pendingToolCalls.delete(index)
        }
      } else if (event.type === 'message_delta' && event.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: event.usage.input_tokens ?? 0,
            completionTokens: event.usage.output_tokens ?? 0,
            totalTokens: (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0),
          },
        } as StreamChunk
      } else if (event.type === 'message_start' && event.message?.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: event.message.usage.input_tokens ?? 0,
            completionTokens: 0,
            totalTokens: event.message.usage.input_tokens ?? 0,
          },
        } as StreamChunk
      } else if (event.type === 'message_stop') {
        sawMessageStop = true
        for (const [, tc] of pendingToolCalls) {
          if (!(yield* emitToolCall(tc))) {
            pendingToolCalls.clear()
            return
          }
        }
        pendingToolCalls.clear()
        yield { type: 'done' }
        return
      }
    } catch {
      // Ignore malformed events.
    }
  }

  pendingToolCalls.clear()
  if (!sawMessageStop) {
    yield adapterErrorChunk('Anthropic stream ended before message_stop')
    return
  }
  yield { type: 'done' }
}

const GEMINI_SUCCESS_FINISH = new Set([
  'STOP',
  'stop',
  'FINISH_REASON_STOP',
])

export async function* parseGeminiStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  let finishReason: string | undefined

  for await (const data of readSSELines(stream)) {
    try {
      const event = JSON.parse(data) as {
        usageMetadata?: {
          promptTokenCount?: number
          candidatesTokenCount?: number
          totalTokenCount?: number
        }
        candidates?: Array<{
          finishReason?: string
          content?: {
            parts?: Array<{
              text?: string
              functionCall?: { id?: string; name?: string; args?: unknown }
            }>
          }
        }>
      }

      if (event.usageMetadata) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: event.usageMetadata.promptTokenCount ?? 0,
            completionTokens: event.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: event.usageMetadata.totalTokenCount ?? 0,
          },
        } as StreamChunk
      }

      const candidate = event.candidates?.[0]
      if (typeof candidate?.finishReason === 'string') {
        finishReason = candidate.finishReason
      }

      const parts = candidate?.content?.parts
      if (!Array.isArray(parts)) continue

      for (const part of parts) {
        if (typeof part.text === 'string' && part.text) {
          yield { type: 'text', content: part.text }
        } else if (part.functionCall) {
          const fc = part.functionCall
          const args =
            typeof fc.args === 'string' ? fc.args : JSON.stringify(fc.args ?? {})
          const parsed = parseCompleteToolArgs(args)
          if (!parsed.ok) {
            yield {
              type: 'error',
              content: parsed.error.message,
              metadata: { error: parsed.error },
            }
            return
          }
          yield {
            type: 'tool_call',
            toolCall: {
              id: fc.id ?? `${fc.name}-${Date.now()}`,
              name: fc.name ?? 'unknown',
              args: parsed.args,
            },
          }
        }
      }
    } catch {
      // Ignore malformed events.
    }
  }

  if (!finishReason || !GEMINI_SUCCESS_FINISH.has(finishReason)) {
    if (finishReason && !GEMINI_SUCCESS_FINISH.has(finishReason)) {
      yield adapterErrorChunk(
        `Gemini stream ended with non-success finish reason "${finishReason}"`,
      )
      return
    }
    yield adapterErrorChunk('Gemini stream ended without a successful finishReason')
    return
  }

  yield { type: 'done' }
}

export async function* parseOllamaStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  let sawDone = false

  for await (const data of readNDJSONLines(stream)) {
    try {
      const event = JSON.parse(data) as {
        message?: {
          content?: string
          tool_calls?: Array<{
            id?: string
            function?: { name?: string; arguments?: unknown }
          }>
        }
        done?: boolean
        prompt_eval_count?: number
        eval_count?: number
      }
      if (event.message?.content) {
        yield { type: 'text', content: event.message.content }
      }
      if (Array.isArray(event.message?.tool_calls)) {
        for (const tc of event.message.tool_calls) {
          if (tc?.function?.name) {
            const args =
              typeof tc.function.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function.arguments ?? {})
            const parsed = parseCompleteToolArgs(args)
            if (!parsed.ok) {
              yield {
                type: 'error',
                content: parsed.error.message,
                metadata: { error: parsed.error },
              }
              return
            }
            yield {
              type: 'tool_call',
              toolCall: {
                id: tc.id ?? `${tc.function.name}-${Date.now()}`,
                name: tc.function.name,
                args: parsed.args,
              },
            }
          }
        }
      }
      if (event.done) {
        sawDone = true
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
          } as StreamChunk
        }
        yield { type: 'done' }
        return
      }
    } catch {
      // Ignore malformed events.
    }
  }

  if (!sawDone) {
    yield adapterErrorChunk('Ollama stream ended without done:true')
    return
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
    if (isAbortError(error)) return false
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
      // Drain the body so the connection can be reused / does not leak.
      await cancelBody(response.body)
      await abortableSleep(delay, signal, sleep)
    } catch (err) {
      lastError = err
      if (isAbortError(err)) throw err
      if (attempt >= opts.maxAttempts || !opts.retryOn({ error: err, attempt })) throw err

      const delay = computeDelay(attempt, opts)
      retryOpt.onRetry?.({
        attempt,
        delayMs: delay,
        reason: err instanceof Error ? err.message : String(err),
      })
      await abortableSleep(delay, signal, sleep)
    }
  }

  // Unreachable, but the TS narrowing needs it.
  throw lastError ?? new Error('fetchWithRetry: exhausted attempts')
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
          await cancelBody(response.body)
          yield adapterErrorChunk(`${errorLabel} error: ${response.status}`)
          return
        }

        let text: string
        try {
          text = await extractText(response)
        } catch (err) {
          await cancelBody(response.body)
          if (isAbortError(err)) return
          const message = err instanceof Error ? err.message : String(err)
          yield adapterErrorChunk(message, { cause: err })
          return
        }

        const chunks = chunkText(text, chunkSize)
        for (const chunk of chunks) {
          if (abortController === null || controller.signal.aborted) return
          if (delayMs > 0) {
            await abortableSleep(delayMs, controller.signal, defaultSleep)
          }
          yield { type: 'text', content: chunk }
        }
        yield { type: 'done' }
      } catch (err) {
        if (isAbortError(err)) return
        const message = err instanceof Error ? err.message : String(err)
        yield adapterErrorChunk(message, { cause: err })
      }
    },
    abort: () => {
      abortController?.abort()
      abortController = null
    },
  }
}
