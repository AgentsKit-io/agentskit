import { AdapterError, ErrorCodes, type Message, type StreamChunk, type StreamSource } from '@agentskit/core'
import { parseRetryAfter, parseSSE, retry, sleep as netSleep } from '@agentskit/net'
import { readNDJSONLines } from './stream-lines'
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

  for await (const { data } of parseSSE(stream)) {
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

  for await (const { data } of parseSSE(stream)) {
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
 * Retry knobs for adapter fetches. Defaults to 3 total attempts, 500 ms base
 * delay, an 8000 ms cap, full jitter, and retrying HTTP 408/429/500/502/503/504
 * or non-abort transport errors. Retries apply only to the initial fetch.
 * Positive fractional `maxAttempts` values normalize down to a whole number of
 * attempts; after exhaustion, the final response is returned. Non-finite
 * values or values whose floored value is below 1 make no request and reject
 * with `AK_CONFIG_INVALID`.
 *
 * @example
 * ```ts
 * const retry: RetryOptions = {
 *   maxAttempts: 4,
 *   retryOn: ({ response }) => response?.status === 429,
 * }
 * ```
 */
export interface RetryOptions {
  /** Total fetch attempts, including the first. Default 3. */
  maxAttempts?: number
  /** First retry delay before jitter. Default 500 ms. */
  baseDelayMs?: number
  /** Maximum backoff and Retry-After delay. Default 8000 ms. */
  maxDelayMs?: number
  /** Enable full jitter. Default true. */
  jitter?: boolean
  /** Select failed responses or errors to retry. */
  retryOn?: (info: { error?: unknown; response?: Response; attempt: number }) => boolean
  /** Called immediately before a retry wait; thrown errors fail the retry operation. */
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void
  /** One-argument wait override. Default uses `@agentskit/net`'s abortable sleep. */
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

class RetryableResponse extends Error {
  constructor(
    readonly response: Response,
    readonly retryAfterMs?: number,
  ) {
    super(`HTTP ${response.status}`)
  }
}

/**
 * Run `doFetch` with retries on transient failures. Returns the last Response
 * even when its status is not ok; transport errors propagate after attempts run
 * out. Retries apply only to the initial fetch, never to a response stream.
 * Exceptions from `onRetry` or the custom `sleep` callback stop the operation.
 *
 * @deprecated Use `retry` from `@agentskit/net` for new code. This compatibility
 * wrapper will not be removed before adapters 0.20.0 or 90 days after this
 * deprecation, whichever is later.
 *
 * @param doFetch Callback invoked once per attempt with the caller's abort signal.
 * @param signal Caller-owned signal. Abort rejects with an `AbortError`.
 * @param retryOpt Retry policy; defaults to 3 attempts, 500 ms base delay,
 *   8000 ms cap, full jitter, and statuses 408/429/500/502/503/504.
 * @returns The successful or final response.
 * @throws {Error} The final transport error, or an AbortError when aborted.
 * @throws {AdapterError} With code AK_CONFIG_INVALID when maxAttempts is non-finite or floors below 1.
 * @example
 * ```ts
 * const response = await fetchWithRetry(signal => fetch(url, { signal }), controller.signal)
 * ```
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
  const maxAttempts = Math.floor(opts.maxAttempts)
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1) {
    throw new AdapterError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'Retry maxAttempts must be finite and at least 1 after flooring',
    })
  }
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

  try {
    return await retry(async ({ attempt }) => {
      let response: Response
      try {
        response = await doFetch(signal)
      } catch (error) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        throw error
      }

      if (response.ok || attempt >= maxAttempts || !opts.retryOn({ response, attempt })) return response

      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      await cancelBody(response.body)
      throw new RetryableResponse(
        response,
        retryAfter === undefined ? undefined : Math.min(retryAfter, opts.maxDelayMs),
      )
    }, {
      retries: maxAttempts - 1,
      minDelayMs: opts.baseDelayMs,
      maxDelayMs: opts.maxDelayMs,
      jitter: opts.jitter ? 'full' : 'none',
      shouldRetry: (error, attempt) => {
        if (error instanceof RetryableResponse) return true
        if (isAbortError(error)) return false
        return opts.retryOn({ error, attempt })
      },
      delayFor: error => error instanceof RetryableResponse ? error.retryAfterMs : undefined,
      onRetry: ({ error, attempt, delayMs }) => {
        retryOpt.onRetry?.({
          attempt,
          delayMs,
          reason: error instanceof RetryableResponse
            ? `HTTP ${error.response.status}`
            : error instanceof Error ? error.message : String(error),
        })
      },
      sleep: retryOpt.sleep
        ? (ms, retrySignal) => abortableSleep(ms, retrySignal ?? signal, retryOpt.sleep!)
        : netSleep,
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    if (error instanceof RetryableResponse) return error.response
    throw error
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
            await abortableSleep(delayMs, controller.signal, netSleep)
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
