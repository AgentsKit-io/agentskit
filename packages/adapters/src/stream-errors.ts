import { AdapterError, ErrorCodes } from '@agentskit/core'
import type { StreamChunk } from '@agentskit/core'

/** True when the error is a caller-initiated abort. */
export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof Error && err.name === 'AbortError') return true
  return false
}

/**
 * Terminal adapter failure as a stream chunk (ADR 0001 A3/A9).
 * Always attaches `metadata.error` as an Error — prefer AdapterError.
 */
export function adapterErrorChunk(
  message: string,
  options?: { cause?: unknown; code?: string },
): StreamChunk {
  const error = new AdapterError({
    code: options?.code ?? ErrorCodes.AK_ADAPTER_STREAM_FAILED,
    message,
    cause: options?.cause,
  })
  return {
    type: 'error',
    content: message,
    metadata: { error },
  }
}

/** Validate complete tool-call args JSON before emitting A5 tool_call. */
export function parseCompleteToolArgs(
  args: string,
): { ok: true; args: string } | { ok: false; error: Error } {
  const raw = args.length > 0 ? args : '{}'
  try {
    JSON.parse(raw)
    return { ok: true, args: raw }
  } catch (cause) {
    return {
      ok: false,
      error: new AdapterError({
        code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
        message: 'Incomplete or malformed tool-call arguments JSON',
        cause,
      }),
    }
  }
}

/**
 * Race a promise against abort. Rejects promptly with AbortError when the
 * signal fires; cleans up the abort listener either way.
 */
export function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const onAbort = (): void => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort)
    promise.then(
      value => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      err => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
}

/** Abort-aware delay used by retry backoff. */
export async function abortableSleep(
  ms: number,
  signal: AbortSignal,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  await raceAbort(sleep(ms), signal)
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
}

export async function cancelBody(body: ReadableStream | null | undefined): Promise<void> {
  if (!body) return
  try {
    await body.cancel()
  } catch {
    // ignore
  }
}
