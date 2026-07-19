import { ConfigError, ErrorCodes, SandboxError } from '@agentskit/core'

/** Default combined stdout+stderr capture cap (1 MiB). */
export const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576

/**
 * Minimal structural contract for the browser globals this backend needs.
 * Declared structurally (rather than relying on lib.dom) so the package can
 * type-check in a Node-only build while staying a pure web-platform backend.
 */
export interface WorkerLike {
  postMessage(message: unknown): void
  terminate(): void
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: { message?: string }) => void) | null
}

interface WorkerCtor {
  new (scriptURL: string, options?: { type?: 'classic' | 'module' }): WorkerLike
}

interface BlobCtor {
  new (parts: string[], options?: { type?: string }): unknown
}

interface UrlStatic {
  createObjectURL(obj: unknown): string
  revokeObjectURL(url: string): void
}

export interface BrowserEnv {
  Worker: WorkerCtor
  Blob: BlobCtor
  URL: UrlStatic
}

/**
 * Message posted back from inside the worker to the host.
 */
export type WorkerOutbound =
  | { type: 'chunk'; stream: 'stdout' | 'stderr'; data: string }
  | { type: 'done'; exitCode: number; stderr: string }

export function assertPositiveTimeout(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${label} must be a finite number > 0 (received ${String(value)})`,
      hint: 'Pass a positive timeout in milliseconds.',
    })
  }
}

export function assertPositiveBytes(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${label} must be a finite number > 0 (received ${String(value)})`,
      hint: 'Pass a positive byte cap.',
    })
  }
}

export function utf8ByteLength(s: string): number {
  // Avoid Node Buffer so this module stays free of node builtins.
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(s).length
  }
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c < 0x80) n += 1
    else if (c < 0x800) n += 2
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4
      i++
    } else n += 3
  }
  return n
}

export function appendCapped(
  current: string,
  chunk: string,
  totalBytes: { n: number },
  maxBytes: number,
  onTruncated: () => void,
): { text: string; accepted: string } {
  if (totalBytes.n >= maxBytes) {
    onTruncated()
    return { text: current, accepted: '' }
  }
  const chunkBytes = utf8ByteLength(chunk)
  const remaining = maxBytes - totalBytes.n
  if (chunkBytes <= remaining) {
    totalBytes.n += chunkBytes
    return { text: current + chunk, accepted: chunk }
  }
  onTruncated()
  let take = Math.min(chunk.length, remaining)
  while (take > 0 && utf8ByteLength(chunk.slice(0, take)) > remaining) {
    take -= 1
  }
  const partial = chunk.slice(0, take)
  totalBytes.n = maxBytes
  return { text: current + partial, accepted: partial }
}

export function resolveBrowserEnv(): BrowserEnv {
  const g = globalThis as Partial<{
    Worker: WorkerCtor
    Blob: BlobCtor
    URL: UrlStatic
  }>

  if (
    typeof g.Worker !== 'function' ||
    typeof g.Blob !== 'function' ||
    !g.URL ||
    typeof g.URL.createObjectURL !== 'function'
  ) {
    throw new SandboxError({
      code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
      message:
        'webWorkerBackend requires a browser environment with Worker, Blob, ' +
        'and URL.createObjectURL. Use a different backend (e.g. E2B or local) ' +
        'on the server.',
      hint:
        'This backend is published at "@agentskit/sandbox/web" and only ' +
        'runs in browsers / Web Worker-capable runtimes.',
    })
  }

  return { Worker: g.Worker, Blob: g.Blob, URL: g.URL }
}

/**
 * The script that runs *inside* the worker. It overrides `console.*` so that
 * everything written by the user code is forwarded to the host as stdout /
 * stderr chunks, then reports an exit code.
 *
 * Isolation is **thread + DOM only**. The worker has no `document`/`window`,
 * but it is **not** a network or filesystem security boundary and is **not**
 * WebContainer.
 */
export const WORKER_RUNNER_SOURCE = /* js */ `
self.onmessage = async (event) => {
  const code = event.data && event.data.code
  const emit = (stream, parts) => {
    const data = parts
      .map((p) => {
        if (typeof p === 'string') return p
        try { return JSON.stringify(p) } catch { return String(p) }
      })
      .join(' ')
    self.postMessage({ type: 'chunk', stream, data: data + '\\n' })
  }
  const origLog = console.log
  console.log = (...args) => emit('stdout', args)
  console.info = (...args) => emit('stdout', args)
  console.debug = (...args) => emit('stdout', args)
  console.warn = (...args) => emit('stderr', args)
  console.error = (...args) => emit('stderr', args)
  let exitCode = 0
  let stderr = ''
  try {
    const fn = new Function('return (async () => {' + code + '\\n})()')
    await fn()
  } catch (err) {
    exitCode = 1
    stderr = err && err.stack ? String(err.stack) : String(err)
    self.postMessage({ type: 'chunk', stream: 'stderr', data: stderr + '\\n' })
  } finally {
    console.log = origLog
  }
  self.postMessage({ type: 'done', exitCode, stderr })
}
`

export interface RunHandle {
  worker: WorkerLike
  objectUrl: string
  env: BrowserEnv
}

export function spawnWorker(env: BrowserEnv): RunHandle {
  const blob = new env.Blob([WORKER_RUNNER_SOURCE], {
    type: 'application/javascript',
  })
  const objectUrl = env.URL.createObjectURL(blob)
  const worker = new env.Worker(objectUrl, { type: 'classic' })
  return { worker, objectUrl, env }
}

export function disposeHandle(handle: RunHandle): void {
  handle.worker.terminate()
  handle.env.URL.revokeObjectURL(handle.objectUrl)
}

/**
 * Full structural narrowing for worker outbound messages. Malformed payloads
 * return false and must be ignored — never propagate NaN/undefined exit codes.
 */
export function isOutbound(value: unknown): value is WorkerOutbound {
  if (typeof value !== 'object' || value === null) return false
  const rec = value as Record<string, unknown>
  if (rec.type === 'chunk') {
    return (
      (rec.stream === 'stdout' || rec.stream === 'stderr') &&
      typeof rec.data === 'string'
    )
  }
  if (rec.type === 'done') {
    return (
      typeof rec.exitCode === 'number' &&
      Number.isFinite(rec.exitCode) &&
      typeof rec.stderr === 'string'
    )
  }
  return false
}

export function normalizeExitCode(code: number): number {
  if (!Number.isFinite(code)) return 1
  return Math.trunc(code)
}

export interface CaptureState {
  stdout: string
  stderr: string
  totalBytes: { n: number }
  truncated: boolean
  maxOutputBytes: number
}

export function applyChunk(
  state: CaptureState,
  stream: 'stdout' | 'stderr',
  data: string,
): string {
  if (state.totalBytes.n >= state.maxOutputBytes) {
    state.truncated = true
    return ''
  }
  const mark = (): void => {
    state.truncated = true
  }
  if (stream === 'stdout') {
    const { text, accepted } = appendCapped(
      state.stdout,
      data,
      state.totalBytes,
      state.maxOutputBytes,
      mark,
    )
    state.stdout = text
    return accepted
  }
  const { text, accepted } = appendCapped(
    state.stderr,
    data,
    state.totalBytes,
    state.maxOutputBytes,
    mark,
  )
  state.stderr = text
  return accepted
}

export function finalStderr(state: CaptureState): string {
  let err = state.stderr.trimEnd()
  if (state.truncated) {
    err = (err ? err + '\n' : '') + `[output truncated at ${state.maxOutputBytes} bytes]`
  }
  return err
}
