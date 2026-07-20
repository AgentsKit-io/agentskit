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
}

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

function composeTimeoutSignal(
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
    timer = setTimeout(() => controller.abort(), timeoutMs)
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
  const { signal, cleanup } = composeTimeoutSignal(timeoutMs, options.signal)

  try {
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
      if (err instanceof ToolError || signal.aborted || isAbortError(err)) throw err
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `HTTP request failed for ${url.toString()}`,
        hint: err instanceof Error ? err.message : 'Network or transport failure.',
        cause: err,
      })
    }

    let text: string
    try {
      text = await response.text()
    } catch (err) {
      if (err instanceof ToolError || signal.aborted || isAbortError(err)) throw err
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `Failed to read response body from ${url.toString()}`,
        hint: err instanceof Error ? err.message : 'Body transport failure.',
        cause: err,
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    const parsed = text.length > 0 ? safeParse(text, contentType, url.toString()) : undefined
    if (!response.ok) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `HTTP ${response.status} ${response.statusText}: ${text.slice(0, 500)}`,
        hint: `URL ${url.toString()}.`,
      })
    }
    return parsed as TResult
  } finally {
    cleanup()
  }
}

function safeParse(text: string, contentType: string, url: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (err) {
    if (/\bjson\b/i.test(contentType)) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `Invalid JSON from ${url} (content-type: ${contentType})`,
        hint: `Body preview: ${text.slice(0, 200)}`,
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
