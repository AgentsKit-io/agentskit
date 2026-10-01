import { ErrorCodes, MemoryError } from '@agentskit/core'
import { NetError, NetErrorCodes, readText } from '@agentskit/net'

export interface RemoteHttpConfig {
  /**
   * Fetch implementation for remote vector calls. Defaults to `globalThis.fetch`.
   * @example qdrant({ url, collection: 'docs', fetch: globalThis.fetch })
   */
  fetch?: typeof globalThis.fetch
  /**
   * Request timeout in milliseconds. Defaults to `15_000`; must be a positive safe integer.
   * Expiry rejects with `AK_MEMORY_REMOTE_HTTP`.
   * @example qdrant({ url, collection: 'docs', timeoutMs: 5_000 })
   */
  timeoutMs?: number
  /**
   * Maximum response body size in bytes. Defaults to 2 MiB and must be a positive safe integer.
   * Overflow rejects with `AK_MEMORY_REMOTE_HTTP`.
   * @example qdrant({ url, collection: 'docs', maxResponseBytes: 1_000_000 })
   */
  maxResponseBytes?: number
  /** Caller-owned signal relayed to remote requests. */
  signal?: AbortSignal
}

const positive = (value: number | undefined, fallback: number, name: string): number => {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError(`${name} must be a positive safe integer.`)
  return resolved
}

async function readBounded(response: Response, maxBytes: number, backend: string): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'))
  try {
    return await readText(response, { maxBytes })
  } catch (cause) {
    if (!(cause instanceof NetError) || cause.code !== NetErrorCodes.AK_NET_BODY_TOO_LARGE) throw cause
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
      message: `${backend} response exceeds the configured byte limit.`,
      ...(Number.isFinite(contentLength) && contentLength > maxBytes
        ? { hint: 'Increase maxResponseBytes only when the upstream response is trusted and bounded.' }
        : {}),
      cause,
    })
  }
}

export async function remoteJson<T>(
  config: RemoteHttpConfig,
  backend: string,
  url: string,
  init: RequestInit,
): Promise<T> {
  const timeoutMs = positive(config.timeoutMs, 15_000, 'timeoutMs')
  const maxResponseBytes = positive(config.maxResponseBytes, 2 * 1024 * 1024, 'maxResponseBytes')
  const controller = new AbortController()
  const relay = () => controller.abort(config.signal?.reason)
  if (config.signal?.aborted) relay()
  else config.signal?.addEventListener('abort', relay, { once: true })
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutError = new MemoryError({
    code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
    message: `${backend} request timed out after ${timeoutMs}ms.`,
  })
  try {
    const fetchImpl = config.fetch ?? globalThis.fetch
    const request = (async () => {
      const response = await fetchImpl(url, { ...init, signal: controller.signal })
      const text = await readBounded(response, maxResponseBytes, backend)
      if (!response.ok) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
          message: `${backend} ${response.status}: ${text.slice(0, 200)}`,
          hint: `Check the ${backend} endpoint and credentials.`,
        })
      }
      try {
        return (text.length > 0 ? JSON.parse(text) : {}) as T
      } catch (cause) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
          message: `${backend} returned invalid JSON.`,
          cause,
        })
      }
    })()
    const timeout = new Promise<never>((_, reject) => {
      // ponytail: keep this deadline local until net exports a full-operation timeout race.
      timer = setTimeout(() => {
        controller.abort(timeoutError)
        reject(timeoutError)
      }, timeoutMs)
    })
    return await Promise.race([request, timeout])
  } finally {
    if (timer) clearTimeout(timer)
    config.signal?.removeEventListener('abort', relay)
  }
}
