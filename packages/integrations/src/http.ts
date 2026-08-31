import { ErrorCodes, ToolError } from '@agentskit/core'

export interface HttpToolOptions {
  baseUrl?: string
  /** Header bag merged into every request (auth, user-agent, etc.). */
  headers?: Record<string, string>
  /** Per-request timeout in ms. Default 20_000. */
  timeoutMs?: number
  /** Caller cancellation signal; composed with the internal timeout. */
  signal?: AbortSignal
  /** Swap in a fake for tests. */
  fetch?: typeof globalThis.fetch
  /** Injectable backoff seam for deterministic tests. Defaults to a signal-aware timer. */
  sleep?: (delayMs: number) => Promise<void>
  /** Injectable clock used when interpreting HTTP-date Retry-After values. */
  now?: () => number
  /** Maximum response body size in bytes. Defaults to 2 MiB. */
  maxResponseBytes?: number
  /** Optional retry policy. Retries are limited to idempotent methods. */
  retry?: RetryPolicy
}

export interface RetryPolicy {
  /** Total attempts, including the first request. Defaults to one. */
  maxAttempts?: number
  /** Delay before the first retry when Retry-After is absent. */
  baseDelayMs?: number
  /** Upper bound for exponential backoff and Retry-After. */
  maxDelayMs?: number
  /** Methods eligible for retry. Defaults to GET, PUT, and DELETE. */
  methods?: RetryableHttpMethod[]
}

export type RetryableHttpMethod = NonNullable<HttpJsonRequest['method']>

export interface HttpJsonRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  query?: Record<string, string | number | undefined>
  body?: unknown
  headers?: Record<string, string>
}

function isAbortError(err: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  )
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

export function composeTimeoutSignal(
  timeoutMs: number,
  outer?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const abortFromOuter = () => {
    controller.abort(outer?.reason)
  }

  if (outer?.aborted) {
    controller.abort(outer.reason)
  } else {
    timer = setTimeout(
      () => controller.abort(new DOMException('The request timed out.', 'TimeoutError')),
      timeoutMs,
    )
    outer?.addEventListener('abort', abortFromOuter, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timer !== undefined) clearTimeout(timer)
      outer?.removeEventListener('abort', abortFromOuter)
    },
  }
}

function isRetryableMethod(method: HttpJsonRequest['method'], allowed: RetryableHttpMethod[] | undefined): boolean {
  if (allowed !== undefined) return allowed.includes(method ?? 'GET')
  return method === undefined || method === 'GET' || method === 'PUT' || method === 'DELETE'
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

function retryAfterMs(value: string | null, now: number): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return undefined
  return Math.max(0, timestamp - now)
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

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (delayMs <= 0) {
    if (signal.aborted) return Promise.reject(signal.reason)
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const abort = () => {
      if (timer !== undefined) clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      reject(signal.reason)
    }
    timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, delayMs)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}

export async function readResponseText(response: Response, maxBytes = 2 * 1024 * 1024): Promise<string> {
  const contentLength = response.headers.get('content-length')
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `HTTP response exceeds maxResponseBytes (${maxBytes})` })
  }
  if (!response.body) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `HTTP response exceeds maxResponseBytes (${maxBytes})` })
    }
    return text
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    total += next.value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `HTTP response exceeds maxResponseBytes (${maxBytes})` })
    }
    chunks.push(next.value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Shared HTTP helper used by the service integrations. Handles query string
 * encoding, JSON body + response parsing, timeouts, and turns non-2xx into
 * throwable errors with the server payload attached.
 *
 * Auth lives entirely in `options.headers` — an action never sees the raw
 * credential; the auth layer binds it before the action runs.
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
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || !Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'timeoutMs and maxResponseBytes must be positive integers' })
  }
  const { signal, cleanup } = composeTimeoutSignal(timeoutMs, options.signal)

  try {
    const retryPolicy = options.retry
    const maxAttempts = Math.max(1, Math.floor(retryPolicy?.maxAttempts ?? 1))
    const baseDelayMs = Math.max(0, retryPolicy?.baseDelayMs ?? 100)
    const maxDelayMs = Math.max(baseDelayMs, retryPolicy?.maxDelayMs ?? 2_000)
    let attempt = 0

    while (true) {
      attempt += 1
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
        isRetryableMethod(request.method, retryPolicy?.methods) &&
        isRetryableStatus(response.status)
      ) {
        const retryDelay = retryAfterMs(response.headers.get('retry-after'), (options.now ?? Date.now)())
        const delayMs = Math.min(retryDelay ?? baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
        if (options.sleep) {
          await options.sleep(delayMs)
          if (signal.aborted) throw signal.reason ?? new DOMException('The request was aborted.', 'AbortError')
        } else {
          await waitForRetry(delayMs, signal)
        }
        continue
      }

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
    }
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
