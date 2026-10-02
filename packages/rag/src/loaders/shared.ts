import {
  isAbortError,
  NetError,
  NetErrorCodes,
  readBody,
  readJson,
  readText,
  withTimeout,
} from '@agentskit/net'
import { RagError, RagErrorCodes } from '../errors'
import type { InputDocument } from '../types'

type S3Body = {
  transformToString?: () => Promise<string>
  transformToByteArray?: () => Promise<Uint8Array>
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}

/**
 * Shared options for remote document loaders.
 * @throws {RagError} with `AK_RAG_LOAD_FAILED` when a request or response read fails.
 */
export interface LoaderOptions {
  fetch?: typeof globalThis.fetch
  /** Optional abort signal forwarded to HTTP and SDK calls when supported. */
  signal?: AbortSignal
  /** Deadline for each remote request/body read. Default 15 seconds; valid range 1–2,147,483,647ms. */
  timeoutMs?: number
  /** Maximum response size in bytes. Default 10 MiB. */
  maxResponseBytes?: number
}

const MAX_TIMEOUT_MS = 2_147_483_647

const limit = (value: number | undefined, fallback: number, name: string): number => {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError(`${name} must be a positive safe integer.`)
  return resolved
}

function resolveTimeoutMs(value: number | undefined): number {
  const timeoutMs = limit(value, 15_000, 'timeoutMs')
  if (timeoutMs > MAX_TIMEOUT_MS) {
    throw new TypeError(`timeoutMs must be no greater than ${MAX_TIMEOUT_MS}.`)
  }
  return timeoutMs
}

export async function withDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutValue: number | undefined,
  label: string,
  parent?: AbortSignal,
): Promise<T> {
  const timeoutMs = resolveTimeoutMs(timeoutValue)
  try {
    return await withTimeout(work, timeoutMs, parent)
  } catch (cause) {
    if (cause instanceof NetError && cause.code === NetErrorCodes.AK_NET_TIMEOUT) {
      throw loadFailed(`${label}: timed out after ${timeoutMs}ms`, cause)
    }
    if (parent?.aborted || isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw cause
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
  const seen = new Set<object>()
  let current = err
  while (current !== null && typeof current === 'object' && !seen.has(current)) {
    if (isAbortError(current)) return true
    seen.add(current)
    current = (current as { cause?: unknown }).cause
  }
  return false
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
  const timeoutMs = resolveTimeoutMs(options.timeoutMs)
  try {
    return await withDeadline(signal => fetchImpl(url, { ...init, signal }), timeoutMs, label, options.signal)
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (options.signal?.aborted || isAbortLike(cause)) {
      throw loadFailed(`${label}: aborted`, cause)
    }
    throw loadFailed(`${label}: network error for ${url}`, cause)
  }
}

type ResponseBodyReader<T> = (response: Response, options: { maxBytes: number }) => Promise<T>

function bridgeResponseBody(response: Response, signal: AbortSignal): Response {
  if (!response.body) return response
  return new Response(
    response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>(), { signal }),
    { headers: response.headers },
  )
}

async function readResponseBody<T>(
  response: Response,
  label: string,
  maxBytes: number,
  timeoutMs: number | undefined,
  signal: AbortSignal | undefined,
  read: ResponseBodyReader<T>,
  parseError = false,
): Promise<T> {
  let bridged: Response | undefined
  try {
    return await withDeadline(combinedSignal => {
      bridged = bridgeResponseBody(response, combinedSignal)
      return read(bridged, { maxBytes })
    }, timeoutMs, label, signal)
  } catch (cause) {
    await (bridged?.body ?? response.body)?.cancel(cause).catch(() => {})
    if (cause instanceof RagError) throw cause
    if (cause instanceof NetError && cause.code === NetErrorCodes.AK_NET_BODY_TOO_LARGE) {
      throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`, cause)
    }
    if (signal?.aborted || isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    const message = parseError && cause instanceof SyntaxError
      ? `${label}: failed to parse response body`
      : `${label}: failed to read response body`
    throw loadFailed(message, cause)
  }
}

export async function readResponseText(
  response: Response,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
  signal?: AbortSignal,
): Promise<string> {
  return readResponseBody(response, label, maxBytes, timeoutMs, signal, readText)
}

export async function readResponseJson<T>(
  response: Response,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
  signal?: AbortSignal,
): Promise<T> {
  return readResponseBody(response, label, maxBytes, timeoutMs, signal, readJson<T>, true)
}

export async function readResponseArrayBuffer(
  response: Response,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const bytes = await readResponseBody(response, label, maxBytes, timeoutMs, signal, readBody)
  return Uint8Array.from(bytes).buffer
}

export async function readS3Body(
  body: S3Body | null | undefined,
  label: string,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs?: number,
  parent?: AbortSignal,
): Promise<string> {
  if (body == null || (
    typeof body.transformToString !== 'function' &&
    typeof body.transformToByteArray !== 'function' &&
    typeof body[Symbol.asyncIterator] !== 'function'
  )) {
    throw loadFailed(`${label}: missing or invalid object body`)
  }
  let cancelBody: (() => Promise<void>) | undefined
  try {
    const iterator = body[Symbol.asyncIterator]?.()
    if (iterator) {
      let cancellation: Promise<void> | undefined
      cancelBody = () => {
        if (cancellation) return cancellation
        try {
          cancellation = Promise.resolve(iterator.return?.()).then(() => {}, () => {})
        } catch {
          cancellation = Promise.resolve()
        }
        return cancellation
      }
    }
    return await withDeadline(async signal => {
      if (iterator && cancelBody) {
        const onAbort = () => { void cancelBody?.() }
        signal.addEventListener('abort', onAbort, { once: true })
        const chunks: Uint8Array[] = []
        let total = 0
        let complete = false
        try {
          while (true) {
            const { done, value } = await iterator.next()
            if (signal.aborted) throw signal.reason
            if (done) {
              complete = true
              break
            }
            const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
            total += bytes.byteLength
            if (total > maxBytes) throw loadFailed(`${label}: response exceeds ${maxBytes} bytes`)
            chunks.push(bytes)
          }
        } finally {
          signal.removeEventListener('abort', onAbort)
          if (!complete) void cancelBody()
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
    }, timeoutMs, label, parent)
  } catch (cause) {
    void cancelBody?.()
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
