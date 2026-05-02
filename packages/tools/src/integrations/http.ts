import { ErrorCodes, ToolError } from '@agentskit/core'

export interface HttpToolOptions {
  baseUrl?: string
  /** Header bag merged into every request (auth, user-agent, etc.). */
  headers?: Record<string, string>
  /** Per-request timeout in ms. Default 20_000. */
  timeoutMs?: number
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

/**
 * Shared HTTP helper used by the provider integrations. Handles
 * query string encoding, JSON body + response parsing, timeouts,
 * and turns non-2xx into throwable errors with the server payload
 * attached.
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

  const url = new URL(
    request.path,
    options.baseUrl ? new URL(options.baseUrl).toString() : 'http://invalid/',
  )
  if (!options.baseUrl) {
    // Allow absolute `path` when no baseUrl is configured.
    url.href = request.path
  }
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const timeoutMs = options.timeoutMs ?? 20_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url.toString(), {
      method: request.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...options.headers,
        ...request.headers,
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: controller.signal,
    })
    const text = await response.text()
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
    clearTimeout(timer)
  }
}

function safeParse(text: string, contentType: string, url: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (err) {
    // If the server advertised JSON but we couldn't parse it, that's a
    // contract violation — surface it as a typed error instead of
    // silently coercing to a string. Any other content-type falls
    // back to the raw text body (the historical behaviour).
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
