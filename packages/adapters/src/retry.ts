import { AdapterError, ErrorCodes } from '@agentskit/core'
import { parseRetryAfter, retry, sleep as netSleep } from '@agentskit/net'
import { abortableSleep, cancelBody, isAbortError } from './stream-errors'

/**
 * Retry policy for adapter fetches only: 3 total attempts, 500 ms base, 8000 ms
 * cap, full jitter, statuses 408/429/500/502/503/504, and non-abort transport
 * errors. Positive fractional attempts floor; invalid values reject with
 * `AK_CONFIG_INVALID` without making a request.
 * @example `const retry: RetryOptions = { maxAttempts: 4, retryOn: ({ response }) => response?.status === 429 }`
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
    if (response) return [408, 429, 500, 502, 503, 504].includes(response.status)
    if (isAbortError(error)) return false
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
 * Run `doFetch` with retries; return the final response on status exhaustion
 * and propagate the final transport error. Only the initial fetch retries;
 * errors from `onRetry` or custom `sleep` stop the operation.
 * @deprecated Use `retry` from `@agentskit/net`; keep this wrapper through at
 * least adapters 0.20.0 or 90 days after deprecation, whichever is later.
 * @param doFetch Called once per attempt with the caller's abort signal.
 * @param signal Caller-owned; abort rejects with `AbortError`.
 * @param retryOpt Defaults to 3 attempts, 500/8000 ms, full jitter, and
 *   statuses 408/429/500/502/503/504.
 * @returns The successful or final response.
 * @throws {Error} The final transport error or `AbortError`.
 * @throws {AdapterError} `AK_CONFIG_INVALID` for invalid `maxAttempts`.
 * @example `const response = await fetchWithRetry(signal => fetch(url, { signal }), controller.signal)`
 */
export async function fetchWithRetry(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  signal: AbortSignal,
  retryOpt: RetryOptions = {},
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY, ...retryOpt }
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
          reason: error instanceof Error ? error.message : String(error),
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
