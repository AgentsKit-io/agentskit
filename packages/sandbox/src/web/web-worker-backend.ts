import { ErrorCodes, SandboxError } from '@agentskit/core'
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from '../types'

/**
 * Options for the zero-dependency, browser-native Web Worker backend.
 */
export interface WebWorkerBackendOptions {
  /**
   * Default execution timeout in milliseconds. Overridden by
   * `ExecuteOptions.timeout` per call. Defaults to 30_000.
   */
  timeout?: number
}

/**
 * A single chunk of streamed output from a running worker.
 */
export interface WebStreamChunk {
  stream: 'stdout' | 'stderr'
  data: string
}

/**
 * Minimal structural contract for the browser globals this backend needs.
 * Declared structurally (rather than relying on lib.dom) so the package can
 * type-check in a Node-only build while staying a pure web-platform backend.
 */
interface WorkerLike {
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

interface BrowserEnv {
  Worker: WorkerCtor
  Blob: BlobCtor
  URL: UrlStatic
}

/**
 * Message posted back from inside the worker to the host.
 */
type WorkerOutbound =
  | { type: 'chunk'; stream: 'stdout' | 'stderr'; data: string }
  | { type: 'done'; exitCode: number; stderr: string }

function resolveBrowserEnv(): BrowserEnv {
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
      hint: 'This backend is published at "@agentskit/sandbox/web" and only ' +
        'runs in browsers / Web Worker-capable runtimes.',
    })
  }

  return { Worker: g.Worker, Blob: g.Blob, URL: g.URL }
}

/**
 * The script that runs *inside* the worker. It overrides `console.*` so that
 * everything written by the user code is forwarded to the host as stdout /
 * stderr chunks, then reports an exit code. Network is not granted any special
 * powers here — isolation is provided by the worker boundary itself; the worker
 * has no DOM access. For untrusted code that must render React, target a
 * `sandbox`ed iframe instead (documented on `webWorkerBackend`).
 */
const WORKER_RUNNER_SOURCE = /* js */ `
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

interface RunHandle {
  worker: WorkerLike
  objectUrl: string
  env: BrowserEnv
}

function spawnWorker(env: BrowserEnv): RunHandle {
  const blob = new env.Blob([WORKER_RUNNER_SOURCE], {
    type: 'application/javascript',
  })
  const objectUrl = env.URL.createObjectURL(blob)
  const worker = new env.Worker(objectUrl, { type: 'classic' })
  return { worker, objectUrl, env }
}

function disposeHandle(handle: RunHandle): void {
  handle.worker.terminate()
  handle.env.URL.revokeObjectURL(handle.objectUrl)
}

function isOutbound(value: unknown): value is WorkerOutbound {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    ((value as { type: unknown }).type === 'chunk' ||
      (value as { type: unknown }).type === 'done')
  )
}

/**
 * Create a zero-dependency, zero-vendor browser code-execution backend that
 * runs JavaScript inside a Web Worker (created from a Blob URL). Conforms to
 * the standard {@link SandboxBackend} contract, so it plugs into
 * `createSandbox({ backend: webWorkerBackend() })` and `sandboxTool`.
 *
 * Isolation: the worker runs off the main thread with no DOM access; user
 * `console.*` is captured into stdout/stderr and uncaught errors become
 * stderr + `exitCode: 1`. For untrusted code that must render React UI, run it
 * inside a `sandbox`ed iframe rather than this worker (the worker has no DOM).
 *
 * Only `language: 'javascript'` is supported; `python` is rejected with a clear
 * error. Network/memory limits are not enforced by the platform here and are
 * accepted but ignored.
 */
export function webWorkerBackend(
  opts: WebWorkerBackendOptions = {},
): SandboxBackend {
  const defaultTimeout = opts.timeout ?? 30_000

  return {
    async execute(
      code: string,
      options: ExecuteOptions = {},
    ): Promise<ExecuteResult> {
      const startTime = Date.now()
      const language = options.language ?? 'javascript'
      const timeout = options.timeout ?? defaultTimeout

      if (language === 'python') {
        return {
          stdout: '',
          stderr:
            'webWorkerBackend only supports JavaScript; ' +
            'received language "python".',
          exitCode: 1,
          durationMs: Date.now() - startTime,
        }
      }

      // resolveBrowserEnv throws SandboxError in non-browser environments;
      // we let it propagate to the caller rather than masking it as a result.
      const env = resolveBrowserEnv()

      const handle = spawnWorker(env)
      let stdout = ''
      let stderr = ''

      return await new Promise<ExecuteResult>((resolve) => {
        let settled = false
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null

        const finish = (result: ExecuteResult): void => {
          if (settled) return
          settled = true
          if (timeoutHandle) clearTimeout(timeoutHandle)
          disposeHandle(handle)
          resolve(result)
        }

        timeoutHandle = setTimeout(() => {
          finish({
            stdout: stdout.trimEnd(),
            stderr:
              (stderr ? stderr.trimEnd() + '\n' : '') +
              `Sandbox execution timed out after ${timeout}ms`,
            exitCode: 1,
            durationMs: Date.now() - startTime,
          })
        }, timeout)

        handle.worker.onmessage = (event: { data: unknown }): void => {
          const msg = event.data
          if (!isOutbound(msg)) return
          if (msg.type === 'chunk') {
            if (msg.stream === 'stdout') stdout += msg.data
            else stderr += msg.data
            return
          }
          // done
          finish({
            stdout: stdout.trimEnd(),
            stderr: stderr.trimEnd(),
            exitCode: msg.exitCode,
            durationMs: Date.now() - startTime,
          })
        }

        handle.worker.onerror = (event: { message?: string }): void => {
          const message = event.message ?? 'Worker error'
          finish({
            stdout: stdout.trimEnd(),
            stderr: (stderr ? stderr.trimEnd() + '\n' : '') + message,
            exitCode: 1,
            durationMs: Date.now() - startTime,
          })
        }

        handle.worker.postMessage({ code })
      })
    },

    async dispose(): Promise<void> {
      // The backend holds no long-lived worker; each execute() spawns and
      // tears down its own. Nothing to clean up.
    },
  }
}

/**
 * Additive streaming helper: runs `code` in a fresh Web Worker and invokes
 * `onChunk` for each stdout/stderr line as it is produced, resolving to the
 * final {@link ExecuteResult}. Useful for live log UIs. Not part of the
 * {@link SandboxBackend} contract — purely additive.
 */
export function runStreaming(
  code: string,
  onChunk: (chunk: WebStreamChunk) => void,
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const startTime = Date.now()
  const language = options.language ?? 'javascript'
  const timeout = options.timeout ?? 30_000

  if (language === 'python') {
    return Promise.resolve({
      stdout: '',
      stderr:
        'runStreaming only supports JavaScript; received language "python".',
      exitCode: 1,
      durationMs: Date.now() - startTime,
    })
  }

  const env = resolveBrowserEnv()
  const handle = spawnWorker(env)
  let stdout = ''
  let stderr = ''

  return new Promise<ExecuteResult>((resolve) => {
    let settled = false
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    const finish = (result: ExecuteResult): void => {
      if (settled) return
      settled = true
      if (timeoutHandle) clearTimeout(timeoutHandle)
      disposeHandle(handle)
      resolve(result)
    }

    timeoutHandle = setTimeout(() => {
      finish({
        stdout: stdout.trimEnd(),
        stderr:
          (stderr ? stderr.trimEnd() + '\n' : '') +
          `Sandbox execution timed out after ${timeout}ms`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
      })
    }, timeout)

    handle.worker.onmessage = (event: { data: unknown }): void => {
      const msg = event.data
      if (!isOutbound(msg)) return
      if (msg.type === 'chunk') {
        if (msg.stream === 'stdout') stdout += msg.data
        else stderr += msg.data
        onChunk({ stream: msg.stream, data: msg.data })
        return
      }
      finish({
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        exitCode: msg.exitCode,
        durationMs: Date.now() - startTime,
      })
    }

    handle.worker.onerror = (event: { message?: string }): void => {
      finish({
        stdout: stdout.trimEnd(),
        stderr: (stderr ? stderr.trimEnd() + '\n' : '') + (event.message ?? 'Worker error'),
        exitCode: 1,
        durationMs: Date.now() - startTime,
      })
    }

    handle.worker.postMessage({ code })
  })
}
