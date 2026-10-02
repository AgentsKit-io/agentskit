import { ErrorCodes, ToolError } from '@agentskit/core'
import {
  isAbortError,
  isRetryableStatus,
  parseRetryAfter,
  retry,
  sleep as netSleep,
} from '@agentskit/net'
import { readResponseBytes, readResponseText } from './http-body'
import { composeTimeoutSignal } from './http-timeout'
export { readResponseBytes, readResponseText } from './http-body'
export { composeTimeoutSignal } from './http-timeout'

export interface HttpToolOptions {
  baseUrl?: string
  /** Header bag merged into every request (auth, user-agent, etc.). */
  headers?: Record<string, string>
  /** Per-request deadline in ms. Must be a positive integer; defaults to 20_000. */
  timeoutMs?: number
  /** Caller cancellation signal; composed with the internal timeout. */
  signal?: AbortSignal
  /** Swap in a fake for tests. */
  fetch?: typeof globalThis.fetch
  /** Injectable one-argument backoff seam. The request deadline ends its wait. */
  sleep?: (delayMs: number) => Promise<void>
  /** Injectable clock for HTTP-date Retry-After values. Defaults to Date.now. */
  now?: () => number
  /** Maximum response body size in bytes. Defaults to 2 MiB. */
  maxResponseBytes?: number
  /** Optional retry policy. Network errors are not retried. */
  retry?: RetryPolicy
}

export interface RetryPolicy {
  /** Total attempts, including the first request. Defaults to 1; valid range is 1–100. */
  maxAttempts?: number
  /** Delay before the first retry when Retry-After is absent. Defaults to 100 ms; doubles without jitter. */
  baseDelayMs?: number
  /** Upper bound for exponential backoff and Retry-After. Defaults to 2,000 ms. */
  maxDelayMs?: number
  /** Methods eligible for retry. Defaults to GET, PUT, and DELETE. */
  methods?: RetryableHttpMethod[]
}

export type RetryableHttpMethod = NonNullable<HttpJsonRequest['method']>

const MAX_TIMEOUT_MS = 2_147_483_647

export interface HttpJsonRequest {
  /** HTTP method. Defaults to GET. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Absolute URL without baseUrl, otherwise a same-origin relative or absolute URL. */
  path: string
  /** Query values are stringified; undefined values are skipped. */
  query?: Record<string, string | number | undefined>
  /** JSON-serialized request body. */
  body?: unknown
  /** Request headers; auth-bound options.headers take precedence case-insensitively. */
  headers?: Record<string, string>
}

/**
 * Case-insensitive header merge. Later bags win; key casing from the
 * winning bag is preserved so callers that read a plain header object still
 * see the auth-bound names.
 */
function mergeHeaders(
  defaults: Record<string, string>,
  requestHeaders: Record<string, string> | undefined,
  boundHeaders: Record<string, string> | undefined,
): Record<string, string> {
  const lowerToKey = new Map<string, string>()
  const out: Record<string, string> = {}

  const set = (key: string, value: string): void => {
    const lower = key.toLowerCase()
    const existing = lowerToKey.get(lower)
    if (existing !== undefined) delete out[existing]
    lowerToKey.set(lower, key)
    out[key] = value
  }

  for (const [key, value] of Object.entries(defaults)) set(key, value)
  if (requestHeaders) {
    for (const [key, value] of Object.entries(requestHeaders)) set(key, value)
  }
  if (boundHeaders) {
    for (const [key, value] of Object.entries(boundHeaders)) set(key, value)
  }
  return out
}

function resolveRequestUrl(options: HttpToolOptions, path: string): URL {
  if (!options.baseUrl) {
    return new URL(path)
  }

  const base = new URL(options.baseUrl)
  const url = new URL(path, base)
  if (url.origin !== base.origin) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: `request URL origin "${url.origin}" does not match configured baseUrl origin "${base.origin}"`,
      hint: 'Auth-bound clients may only request the configured base origin. Use a relative path or same-origin absolute URL.',
    })
  }
  return url
}

const MAX_RETRY_ATTEMPTS = 100

function isRetryableMethod(method: HttpJsonRequest['method'], allowed: RetryableHttpMethod[] | undefined): boolean {
  if (allowed !== undefined) return allowed.includes(method ?? 'GET')
  return method === undefined || method === 'GET' || method === 'PUT' || method === 'DELETE'
}

function retryOptions(policy: RetryPolicy | undefined): {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
} {
  const maxAttempts = policy?.maxAttempts ?? 1
  const baseDelayMs = policy?.baseDelayMs ?? 100
  const maxDelayMs = policy?.maxDelayMs ?? 2_000
  const methods = policy?.methods
  const validMethods = new Set<RetryableHttpMethod>(['GET', 'PUT', 'DELETE', 'POST', 'PATCH'])
  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > MAX_RETRY_ATTEMPTS ||
    !Number.isInteger(baseDelayMs) ||
    baseDelayMs < 0 ||
    baseDelayMs > MAX_TIMEOUT_MS ||
    !Number.isInteger(maxDelayMs) ||
    maxDelayMs < baseDelayMs ||
    maxDelayMs > MAX_TIMEOUT_MS ||
    methods?.some((method) => !validMethods.has(method))
  ) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: `retry configuration must use finite integer delays and 1-${MAX_RETRY_ATTEMPTS} attempts`,
    })
  }
  return { maxAttempts, baseDelayMs, maxDelayMs }
}

function waitForRetry(customSleep: HttpToolOptions['sleep']): (delayMs: number, signal?: AbortSignal) => Promise<void> {
  if (!customSleep) return netSleep
  return (delayMs, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const abort = () => {
      cleanup()
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', abort, { once: true })
    Promise.resolve().then(() => customSleep(delayMs)).then(
      () => { cleanup(); resolve() },
      (error: unknown) => { cleanup(); reject(error) },
    )
  })
}

class RetryableHttpStatus extends Error {
  constructor(readonly retryAfterMs: number | undefined) {
    super('retryable HTTP status')
  }
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/(\/bot)[^/\s]+/gi, '$1[REDACTED]')
    .replace(/((?:"?(?:access[-_]?token|refresh[-_]?token|client[-_]?secret|bot[-_]?token|token|secret|password|api[-_]?key|authorization|signature)"?)\s*:\s*")[^"]*(")/gi, '$1[REDACTED]$2')
    .replace(/((?:access[-_]?token|refresh[-_]?token|client[-_]?secret|bot[-_]?token|token|secret|password|api[-_]?key|authorization|signature)\s*[=:]\s*["']?)[^\s,"'}]+/gi, '$1[REDACTED]')
}

function upstreamHint(status: number, attempt: number, maxAttempts: number): string {
  if (status === 429) return 'Provider rate-limited the request; respect Retry-After before trying again.'
  if (attempt === maxAttempts && isRetryableStatus(status)) {
    return `Provider returned HTTP ${status} after retry attempts were exhausted.`
  }
  return `Provider returned HTTP ${status}.`
}

/**
 * Send one JSON HTTP request and parse its response.
 *
 * A request deadline spans fetch, body reading, and retry waits. The default
 * response limit is 2 MiB. Configured retries count total attempts and only
 * retry 408, 425, 429, 500, 502, 503, and 504 responses for GET, PUT, and
 * DELETE (or methods explicitly allowed by `retry.methods`). Backoff starts
 * at 100 ms, doubles without jitter, and caps at 2,000 ms by default. Delta
 * seconds in `Retry-After` are rounded to the nearest millisecond by the
 * shared `@agentskit/net` parser.
 *
 * Auth lives entirely in `options.headers` — an action never sees the raw
 * credential; the auth layer binds it before the action runs.
 *
 * @param options Base URL, auth headers, timeout, response limit, and optional retry policy.
 * @param request Method, path, query, JSON body, and per-request headers.
 * @returns The parsed JSON value, raw text for non-JSON content types, or undefined for an empty body.
 * @throws {ToolError} With code AK_TOOL_INVALID_INPUT for invalid options or requests, including origin escapes.
 * @throws {ToolError} With code AK_TOOL_EXEC_FAILED for fetch/read failures, oversized bodies, non-2xx responses, or invalid JSON; transport, reader, and parse errors retain their cause where available.
 * @throws {unknown} With the caller's exact signal reason, or the native timeout reason, when cancelled.
 * @example
 * ```ts
 * import { httpJson } from '@agentskit/integrations'
 *
 * const result = await httpJson<{ items: string[] }>(
 *   { baseUrl: 'https://api.example.com', timeoutMs: 5_000, retry: { maxAttempts: 3 } },
 *   { path: '/items', query: { limit: 10 } },
 * )
 * ```
 */
export async function httpJson<TResult = unknown>(
  options: HttpToolOptions,
  request: HttpJsonRequest,
): Promise<TResult> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  if (!fetchImpl) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: 'no fetch available',
      hint: 'Run on Node ≥ 18 (or pass options.fetch explicitly).',
    })
  }

  const url = resolveRequestUrl(options, request.path)
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const headers = mergeHeaders(
    {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    request.headers,
    options.headers,
  )

  const timeoutMs = options.timeoutMs ?? 20_000
  const maxResponseBytes = options.maxResponseBytes ?? 2 * 1024 * 1024
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'timeoutMs and maxResponseBytes must be positive integers' })
  }
  const { signal, cleanup } = composeTimeoutSignal(timeoutMs, options.signal)

  try {
    const retryPolicy = options.retry
    const { maxAttempts, baseDelayMs, maxDelayMs } = retryOptions(retryPolicy)
    const canRetryMethod = isRetryableMethod(request.method, retryPolicy?.methods)
    const { response, text, attempt } = await retry(
      async ({ attempt }) => {
        let response: Response
        try {
          response = await fetchImpl(url.toString(), {
            method: request.method ?? 'GET',
            headers,
            body: request.body === undefined ? undefined : JSON.stringify(request.body),
            signal,
            redirect: 'error',
          })
        } catch (err) {
          if (err instanceof ToolError || signal.aborted || isAbortError(err)) {
            throw signal.aborted ? signal.reason ?? err : err
          }
          throw new ToolError({
            code: ErrorCodes.AK_TOOL_EXEC_FAILED,
            message: 'HTTP request failed before a response was received.',
            hint: 'Network or transport failure. Inspect the attached cause for diagnostics.',
            cause: err,
          })
        }

        let text: string
        try {
          text = await readResponseText(response, maxResponseBytes)
        } catch (err) {
          if (err instanceof ToolError || signal.aborted || isAbortError(err)) {
            throw signal.aborted ? signal.reason ?? err : err
          }
          throw new ToolError({
            code: ErrorCodes.AK_TOOL_EXEC_FAILED,
            message: 'Failed to read the HTTP response body.',
            hint: 'Response body transport failure. Inspect the attached cause for diagnostics.',
            cause: err,
          })
        }

        if (
          !response.ok &&
          attempt < maxAttempts &&
          canRetryMethod &&
          isRetryableStatus(response.status)
        ) {
          const retryAfter = parseRetryAfter(response.headers.get('retry-after'), (options.now ?? Date.now)())
          throw new RetryableHttpStatus(retryAfter)
        }

        return { response, text, attempt }
      },
      {
        retries: maxAttempts - 1,
        minDelayMs: baseDelayMs,
        maxDelayMs,
        jitter: 'none',
        signal,
        shouldRetry: (error) => error instanceof RetryableHttpStatus,
        delayFor: (error) => error instanceof RetryableHttpStatus && error.retryAfterMs !== undefined
          ? Math.min(error.retryAfterMs, maxDelayMs)
          : undefined,
        sleep: waitForRetry(options.sleep),
      },
    )

    const contentType = response.headers.get('content-type') ?? ''
    const parsed = text.length > 0 ? safeParse(text, contentType, url.toString()) : undefined
    if (!response.ok) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `HTTP ${response.status} ${response.statusText}: ${redactSensitiveText(text).slice(0, 500)}`,
        hint: upstreamHint(response.status, attempt, maxAttempts),
      })
    }
    return parsed as TResult
  } finally {
    cleanup()
  }
}

function safeParse(text: string, contentType: string, _url: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (err) {
    if (/\bjson\b/i.test(contentType)) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `Invalid JSON response (content-type: ${contentType})`,
        hint: `Body preview: ${redactSensitiveText(text).slice(0, 200)}`,
        cause: err,
      })
    }
    return text
  }
}

/**
 * An auth-bound HTTP client handed to every `IntegrationAction.execute`. The
 * `baseUrl`, auth headers, and timeout are already applied — the action only
 * supplies the per-request path/method/body.
 */
export type IntegrationHttp = <TResult = unknown>(request: HttpJsonRequest) => Promise<TResult>

/** Bind `httpJson` to a fixed set of options, producing an `IntegrationHttp`. */
export function bindHttp(options: HttpToolOptions): IntegrationHttp {
  return <TResult = unknown>(request: HttpJsonRequest) => httpJson<TResult>(options, request)
}
