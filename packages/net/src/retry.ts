import { invalidInput, isAbortError } from './errors'

/** Statuses that are safe to retry: the server did not (fully) handle the request. */
export const RETRYABLE_STATUSES: readonly number[] = [408, 425, 429, 500, 502, 503, 504]

/** Check whether an HTTP status is in {@link RETRYABLE_STATUSES}.
 *
 * @param status HTTP response status code.
 * @returns Whether the status is configured as retryable.
 */
export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.includes(status)
}

/** Options for the exponential delay used between retries. */
export interface BackoffOptions {
  /** Delay before the first retry. Default 250 ms. */
  minDelayMs?: number
  /** Cap for any computed delay. Default 10 000 ms. */
  maxDelayMs?: number
  /** Growth per attempt. Default 2. */
  factor?: number
  /** `full` (default) picks a random delay in [0, backoff] to avoid thundering herds; `none` is deterministic. */
  jitter?: 'full' | 'none'
}

/** Delay before retry number `attempt` (1-based). */
export function computeBackoff(attempt: number, options: BackoffOptions = {}, random: () => number = Math.random): number {
  const min = options.minDelayMs ?? 250
  const max = options.maxDelayMs ?? 10_000
  const factor = options.factor ?? 2
  const base = Math.min(max, min * factor ** Math.max(0, attempt - 1))
  return options.jitter === 'none' ? base : Math.round(random() * base)
}

/**
 * Parse a `Retry-After` header (delta-seconds or HTTP date) into milliseconds
 * from `now`. Returns undefined when absent or unparsable.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 1000)
  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, date - now)
}

/** Context passed to each invocation of a retry callback. */
export interface RetryContext {
  /** 1-based attempt number that is about to run. */
  attempt: number
  signal?: AbortSignal
}

/** Retry count, delay, cancellation, and callback settings for {@link retry}. */
export interface RetryOptions extends BackoffOptions {
  /** Retries after the first attempt. Default 3. */
  retries?: number
  /** Decide whether an error is worth retrying. Default: anything but an abort. */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** Override the delay for one failure (e.g. from `Retry-After`); not capped by `maxDelayMs`. */
  delayFor?: (error: unknown, attempt: number) => number | undefined
  /** Called before sleeping. */
  onRetry?: (info: { error: unknown; attempt: number; delayMs: number }) => void
  /**
   * Wait before retrying. Defaults to the exported abortable `sleep`.
   * Receives the delay and retry signal; honor the signal to stop custom waits
   * on abort. One-argument callbacks remain assignable.
   */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
  signal?: AbortSignal
}

/**
 * Wait for a delay from zero through 2,147,483,647 ms, or reject when
 * `signal` aborts.
 * The default timer is cleared on abort and the promise rejects with the
 * signal's actual reason.
 *
 * @param ms Delay in milliseconds from zero through 2,147,483,647; zero is allowed.
 * @param signal Optional abort signal. Defaults to no signal.
 * @returns A promise fulfilled when the delay ends.
 * @throws {NetError} With code AK_NET_INVALID_INPUT when `ms` is negative, non-finite, or above 2,147,483,647.
 * @throws {unknown} With the exact `signal.reason` when `signal` aborts.
 * @since 0.2.0
 * @example
 * ```ts
 * import { sleep } from '@agentskit/net'
 *
 * const controller = new AbortController()
 * await sleep(250, controller.signal)
 * ```
 */
export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (!Number.isFinite(ms) || ms < 0 || ms > 2_147_483_647) {
    throw invalidInput('delay must be between 0 and 2147483647 milliseconds')
  }
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Run `fn` until it succeeds or retries run out, sleeping with exponential
 * backoff (full jitter) between attempts. Aborts stop immediately and are
 * never retried.
 */
export async function retry<T>(fn: (context: RetryContext) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3
  if (!Number.isInteger(retries) || retries < 0) throw invalidInput('retries must be a non-negative integer')
  const shouldRetry = options.shouldRetry ?? ((error: unknown) => !isAbortError(error))
  for (let attempt = 1; ; attempt++) {
    if (options.signal?.aborted) throw options.signal.reason
    try {
      return await fn({ attempt, signal: options.signal })
    } catch (error) {
      if (attempt > retries || options.signal?.aborted || !shouldRetry(error, attempt)) throw error
      // An explicit delay (e.g. Retry-After) is used as given; callers cap it.
      const delayMs = options.delayFor?.(error, attempt) ?? computeBackoff(attempt, options)
      options.onRetry?.({ error, attempt, delayMs })
      await (options.sleep ?? sleep)(delayMs, options.signal)
    }
  }
}
