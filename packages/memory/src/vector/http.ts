import { ErrorCodes, MemoryError } from '@agentskit/core'

export interface RemoteHttpConfig {
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  maxResponseBytes?: number
  signal?: AbortSignal
}

const positive = (value: number | undefined, fallback: number, name: string): number => {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError(`${name} must be a positive safe integer.`)
  return resolved
}

async function readBounded(response: Response, maxBytes: number, backend: string): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
      message: `${backend} response exceeds the configured byte limit.`,
      hint: `Increase maxResponseBytes only when the upstream response is trusted and bounded.`,
    })
  }
  if (!response.body) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new MemoryError({ code: ErrorCodes.AK_MEMORY_REMOTE_HTTP, message: `${backend} response exceeds the configured byte limit.` })
    }
    return text
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new MemoryError({ code: ErrorCodes.AK_MEMORY_REMOTE_HTTP, message: `${backend} response exceeds the configured byte limit.` })
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
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
  try {
    const fetchImpl = config.fetch ?? globalThis.fetch
    const request = fetchImpl(url, { ...init, signal: controller.signal })
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort(new Error(`${backend} request timed out`))
        reject(new MemoryError({
          code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
          message: `${backend} request timed out after ${timeoutMs}ms.`,
        }))
      }, timeoutMs)
    })
    const response = await Promise.race([request, timeout])
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
  } finally {
    if (timer) clearTimeout(timer)
    config.signal?.removeEventListener('abort', relay)
  }
}
