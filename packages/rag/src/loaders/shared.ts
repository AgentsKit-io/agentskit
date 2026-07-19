import { RagError, RagErrorCodes } from '../errors'
import type { InputDocument } from '../types'

export interface LoaderOptions {
  fetch?: typeof globalThis.fetch
  /** Optional abort signal forwarded to underlying HTTP calls when supported. */
  signal?: AbortSignal
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
): Promise<Response> {
  try {
    return await fetchImpl(url, init)
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) {
      throw loadFailed(`${label}: aborted`, cause)
    }
    throw loadFailed(`${label}: network error for ${url}`, cause)
  }
}

export async function readResponseText(response: Response, label: string): Promise<string> {
  try {
    return await response.text()
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw loadFailed(`${label}: failed to read response body`, cause)
  }
}

export async function readResponseJson<T>(response: Response, label: string): Promise<T> {
  try {
    return (await response.json()) as T
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw loadFailed(`${label}: failed to parse response body`, cause)
  }
}

export async function readResponseArrayBuffer(response: Response, label: string): Promise<ArrayBuffer> {
  try {
    return await response.arrayBuffer()
  } catch (cause) {
    if (cause instanceof RagError) throw cause
    if (isAbortLike(cause)) throw loadFailed(`${label}: aborted`, cause)
    throw loadFailed(`${label}: failed to read response body`, cause)
  }
}

export async function readS3Body(
  body: { transformToString?: () => Promise<string> } | null | undefined,
  label: string,
): Promise<string> {
  if (body == null || typeof body.transformToString !== 'function') {
    throw loadFailed(`${label}: missing or invalid object body`)
  }
  try {
    return await body.transformToString()
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
