import { NetError, NetErrorCodes, invalidInput, isAbortError } from './errors'
import { isRetryableStatus, parseRetryAfter, retry, type BackoffOptions } from './retry'
import { timeoutSignal } from './timeout'

const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'TRACE']

/** Retry, timeout, and fetch implementation settings for {@link fetchWithRetry}. */
export interface FetchWithRetryOptions extends BackoffOptions {
  /** Retries after the first attempt. Default 3. */
  retries?: number
  /** Per-attempt timeout. The overall budget is `init.signal`. */
  timeoutMs?: number
  /**
   * Methods that may be retried. Default: idempotent methods only. Pass
   * `'all'` for APIs where a 429/5xx means the request was not processed
   * (most LLM providers).
   */
  retryMethods?: readonly string[] | 'all'
  /** Statuses that trigger a retry. Default {@link RETRYABLE_STATUSES}. */
  retryStatuses?: readonly number[]
  /** Longest `Retry-After` to honour; a longer one returns the response instead. Default 60 000 ms. */
  maxRetryAfterMs?: number
  onRetry?: (info: { attempt: number; delayMs: number; status?: number; error?: unknown }) => void
  /** Fetch implementation. Default `globalThis.fetch`. */
  fetch?: typeof fetch
}

class RetryableResponse extends Error {
  constructor(readonly response: Response, readonly retryAfterMs: number | undefined) {
    super(`HTTP ${response.status}`)
  }
}

function isReplayableBody(body: BodyInit | null | undefined): boolean {
  return body === undefined || body === null || !(typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
}

/**
 * `fetch` with per-attempt timeouts and retries on network errors and
 * retryable statuses (408/425/429/5xx), honouring `Retry-After`. The last
 * response is returned as-is (a non-2xx status is not an error); network
 * failures after the last attempt reject. Streaming request bodies are never
 * retried because they cannot be replayed.
 *
 * @param input URL, URL string, or request to send.
 * @param init Standard fetch request options.
 * @param options Retry, timeout, and fetch implementation settings.
 * @returns The final response, including non-2xx responses.
 * @throws {NetError} With code AK_NET_INVALID_INPUT when no fetch implementation is available.
 * @example
 * ```ts
 * import { fetchWithRetry } from '@agentskit/net'
 *
 * const response = await fetchWithRetry('https://api.example.com/data')
 * ```
 */
export async function fetchWithRetry(
  input: string | URL | Request,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const doFetch = options.fetch ?? globalThis.fetch
  if (typeof doFetch !== 'function') throw invalidInput('No fetch implementation available')
  const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const methodAllowed = options.retryMethods === 'all' || (options.retryMethods ?? IDEMPOTENT_METHODS).map(m => m.toUpperCase()).includes(method)
  const retries = methodAllowed && isReplayableBody(init.body) ? (options.retries ?? 3) : 0
  const statuses = options.retryStatuses ?? null
  const retryableStatus = (status: number) => (statuses ? statuses.includes(status) : isRetryableStatus(status))
  const maxRetryAfter = options.maxRetryAfterMs ?? 60_000
  return retry(
      async ({ attempt }) => {
        const signal = options.timeoutMs ? timeoutSignal(options.timeoutMs, init.signal ?? undefined) : (init.signal ?? undefined)
        let response: Response
        try {
          response = await doFetch(input instanceof Request ? input.clone() : input, { ...init, signal })
        } catch (error) {
          if (init.signal?.aborted) throw error
          if (isAbortError(error)) {
            throw new NetError({
              code: NetErrorCodes.AK_NET_TIMEOUT,
              message: `Request timed out after ${options.timeoutMs} ms (attempt ${attempt})`,
              cause: error,
            })
          }
          throw error
        }
        if (attempt <= retries && retryableStatus(response.status)) {
          const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'))
          if (retryAfterMs === undefined || retryAfterMs <= maxRetryAfter) {
            throw new RetryableResponse(response, retryAfterMs)
          }
        }
        return response
      },
      {
        ...options,
        retries,
        signal: init.signal ?? undefined,
        shouldRetry: error => !init.signal?.aborted && (error instanceof RetryableResponse || !isAbortError(error)),
        delayFor: error => (error instanceof RetryableResponse ? error.retryAfterMs : undefined),
        onRetry: ({ error, attempt, delayMs }) => {
          if (error instanceof RetryableResponse) {
            // Free the connection of a response we are about to discard.
            void error.response.body?.cancel().catch(() => {})
            options.onRetry?.({ attempt, delayMs, status: error.response.status })
          } else {
            options.onRetry?.({ attempt, delayMs, error })
          }
        },
      },
  )
}
