import { RagError, RagErrorCodes } from '../errors'
import type { InputDocument } from '../types'

type S3Body = {
  transformToString?: () => Promise<string>
  transformToByteArray?: () => Promise<Uint8Array>
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}

export interface LoaderOptions {
  fetch?: typeof globalThis.fetch
  /** Optional abort signal forwarded to underlying HTTP calls when supported. */
  signal?: AbortSignal
  /** Finite deadline for each remote operation. Default 15 seconds. */
  timeoutMs?: number
  /** Maximum response size in bytes. Default 10 MiB. */
  maxResponseBytes?: number
}

const limit = (value: number | undefined, fallback: number, name: string): number => {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError(`${name} must be a positive safe integer.`)
  return resolved
}

export async function withDeadline<T>(promise: Promise<T>, timeoutValue: number | undefined, label: string): Promise<T> {
  const timeoutMs = limit(timeoutValue, 15_000, 'timeoutMs')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(loadFailed(`${label}: timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function resolveMaxFiles(maxFiles: number | undefined, fallback = 100): number {
  if (maxFiles === undefined) return fallback
  if (!Number.isFinite(maxFiles)) return 0
  return Math.max(0, Math.floor(maxFiles))
}

export function loadFailed(message: string, cause?: unknown): RagError {
  return new RagError({
    code: RagErrorCodes.AK_RAG_LOAD_FAILED,
    message,
    cause,
  })
}

export function isAbortLike(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  const name = (err as { name?: unknown }).name
  if (name === 'AbortError') return true
  const cause = (err as { cause?: unknown }).cause
  return cause !== undefined && isAbortLike(cause)
}

export function ensureNotAborted(signal: AbortSignal | undefined, label: string): void {
  if (signal?.aborted) {
    throw loadFailed(`${label}: aborted`, signal.reason)
  }
}

/** Rethrow aborts; swallow other individual download failures. */
export function rethrowIfAbort(err: unknown, signal: AbortSignal | undefined, label: string): void {
  ensureNotAborted(signal, label)
  if (isAbortLike(err)) {
    if (err instanceof RagError) throw err
    throw loadFailed(`${label}: aborted`, err)
  }
}

export function finishTreeLoad(
  label: string,
  attempted: number,
  loaded: number,
  docs: InputDocument[],
): InputDocument[] {
  if (attempted > 0 && loaded === 0) {
    throw loadFailed(`${label}: all eligible downloads failed`)
  }
  return docs
}

export async function doFetch(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  init: RequestInit | undefined,
  label: string,
  options: LoaderOptions = {},
): Promise<Response> {
  const timeoutMs = limit(options.timeoutMs, 15_000, 'timeoutMs')
  const controller = new AbortController()
  const relay = () => controller.abort(options.signal?.reason)
  if (options.signal?.aborted) relay()
  else options.signal?.addEventListener('abort', relay, { once: true })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const request = fetchImpl(url, { ...init, signal: controller.signal })
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort(new Error(`${label} request timed out`))
        reject(loadFailed(`${label}: timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
    return await Promise.race([request, timeout])
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) {
      throw loadFailed(`${label}: aborted`, cause)
    }
    throw loadFailed(`${label}: network error for ${url}`, cause)
  } finally {
    if (timer) clearTimeout(timer)
    options.signal?.removeEventListener('abort', relay)
  }
}

async function readBytes(response: Response, label: string, maxBytes: number): Promise<Uint8Array> {
  const contentLength = Number(response.headers?.get?.('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`)
  if (!response.body || typeof response.body.getReader !== 'function') {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > maxBytes) throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`)
    return bytes
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
        throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`)
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

export async function readResponseText(
  response: Response,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
): Promise<string> {
  try {
    return new TextDecoder().decode(await withDeadline(readBytes(response, label, maxBytes), timeoutMs, label))
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw loadFailed(`${label}: failed to read response body`, cause)
  }
}

export async function readResponseJson<T>(
  response: Response,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
): Promise<T> {
  try {
    return JSON.parse(await readResponseText(response, label, maxBytes, timeoutMs)) as T
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw loadFailed(`${label}: failed to parse response body`, cause)
  }
}

export async function readResponseArrayBuffer(
  response: Response,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
): Promise<ArrayBuffer> {
  try {
    const bytes = await withDeadline(readBytes(response, label, maxBytes), timeoutMs, label)
    return Uint8Array.from(bytes).buffer
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw loadFailed(`${label}: failed to read response body`, cause)
  }
}

export async function readS3Body(
  body: S3Body | null | undefined,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
): Promise<string> {
  if (body == null || (typeof body.transformToString !== 'function' && typeof body.transformToByteArray !== 'function')) {
    throw loadFailed(`${label}: missing or invalid object body`)
  }
  try {
    return await withDeadline((async () => {
      if (body[Symbol.asyncIterator]) {
        const chunks: Uint8Array[] = []
        let total = 0
        for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
          const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
          total += bytes.byteLength
          if (total > maxBytes) throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`)
          chunks.push(bytes)
        }
        const result = new Uint8Array(total)
        let offset = 0
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
        return new TextDecoder().decode(result)
      }
      if (body.transformToByteArray) {
        const bytes = await body.transformToByteArray()
        if (bytes.byteLength > maxBytes) throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`)
        return new TextDecoder().decode(bytes)
      }
      const text = await body.transformToString!()
      if (new TextEncoder().encode(text).byteLength > maxBytes) throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`)
      return text
    })(), timeoutMs, label)
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw loadFailed(`${label}: failed to read object body`, cause)
  }
}

export function encodePathSegments(path: string): string {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}
