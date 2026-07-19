import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from '../types'
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  assertPositiveBytes,
  assertPositiveTimeout,
  applyChunk,
  disposeHandle,
  finalStderr,
  isOutbound,
  normalizeExitCode,
  resolveBrowserEnv,
  spawnWorker,
  type CaptureState,
} from './web-worker-helpers'

/**
 * Options for the zero-dependency, browser-native Web Worker backend.
 *
 * ## Isolation boundaries (honest)
 *
 * | Boundary | Provided? |
 * |---|---|
 * | Thread isolation (off main thread) | Yes |
 * | DOM isolation (no `document` / `window`) | Yes |
 * | Network security boundary | **No** — `fetch`/`WebSocket` remain available |
 * | Filesystem security boundary | **No** — not applicable in browser; OPFS etc. still reachable if granted |
 * | WebContainer | **No** — this is **not** StackBlitz WebContainer |
 *
 * Treat this backend as a convenience isolate for trusted or semi-trusted
 * JavaScript, not as a multi-tenant security sandbox.
 */
export interface WebWorkerBackendOptions {
  /**
   * Default execution timeout in milliseconds. Overridden by
   * `ExecuteOptions.timeout` per call. Defaults to 30_000. Must be finite &gt; 0.
   */
  timeout?: number
  /**
   * Cap on combined stdout + stderr in bytes. Defaults to 1 MiB.
   */
  maxOutputBytes?: number
}

/**
 * A single chunk of streamed output from a running worker.
 */
export interface WebStreamChunk {
  stream: 'stdout' | 'stderr'
  data: string
}

/**
 * Create a zero-dependency, zero-vendor browser code-execution backend that
 * runs JavaScript inside a Web Worker (created from a Blob URL). Conforms to
 * the standard {@link SandboxBackend} contract, so it plugs into
 * `createSandbox({ backend: webWorkerBackend() })` and `sandboxTool`.
 *
 * **Isolation (read carefully):**
 * - Thread isolation: yes (off the main thread)
 * - DOM isolation: yes (no DOM APIs)
 * - Network boundary: **no**
 * - Filesystem boundary: **no**
 * - Not WebContainer
 *
 * Only `language: 'javascript'` is supported; `python` is rejected with a clear
 * error. `memoryLimit` is accepted on {@link ExecuteOptions} but ignored.
 */
export function webWorkerBackend(
  opts: WebWorkerBackendOptions = {},
): SandboxBackend {
  const defaultTimeout = opts.timeout ?? 30_000
  assertPositiveTimeout(defaultTimeout, 'WebWorkerBackendOptions.timeout')
  const defaultMaxOutputBytes = opts.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  if (opts.maxOutputBytes !== undefined) {
    assertPositiveBytes(opts.maxOutputBytes, 'WebWorkerBackendOptions.maxOutputBytes')
  }

  return {
    async execute(
      code: string,
      options: ExecuteOptions = {},
    ): Promise<ExecuteResult> {
      const startTime = Date.now()
      const language = options.language ?? 'javascript'
      if (language !== 'javascript' && language !== 'python') {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `ExecuteOptions.language must be "javascript" or "python" (received ${JSON.stringify(language)})`,
        })
      }
      const timeout = options.timeout ?? defaultTimeout
      assertPositiveTimeout(timeout, 'ExecuteOptions.timeout')
      const maxOutputBytes = options.maxOutputBytes ?? defaultMaxOutputBytes
      assertPositiveBytes(maxOutputBytes, 'ExecuteOptions.maxOutputBytes')

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

      const env = resolveBrowserEnv()
      const handle = spawnWorker(env)
      const state: CaptureState = {
        stdout: '',
        stderr: '',
        totalBytes: { n: 0 },
        truncated: false,
        maxOutputBytes,
      }

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
            stdout: state.stdout.trimEnd(),
            stderr:
              (state.stderr ? state.stderr.trimEnd() + '\n' : '') +
              `Sandbox execution timed out after ${timeout}ms`,
            exitCode: 1,
            durationMs: Date.now() - startTime,
          })
        }, timeout)

        handle.worker.onmessage = (event: { data: unknown }): void => {
          const msg = event.data
          if (!isOutbound(msg)) return
          if (msg.type === 'chunk') {
            applyChunk(state, msg.stream, msg.data)
            return
          }
          finish({
            stdout: state.stdout.trimEnd(),
            stderr: finalStderr(state),
            exitCode: normalizeExitCode(msg.exitCode),
            durationMs: Date.now() - startTime,
          })
        }

        handle.worker.onerror = (event: { message?: string }): void => {
          const message = event.message ?? 'Worker error'
          finish({
            stdout: state.stdout.trimEnd(),
            stderr: (state.stderr ? state.stderr.trimEnd() + '\n' : '') + message,
            exitCode: 1,
            durationMs: Date.now() - startTime,
          })
        }

        handle.worker.postMessage({ code })
      })
    },

    async dispose(): Promise<void> {
      // No long-lived worker; each execute() spawns and tears down its own.
    },
  }
}

/**
 * Additive streaming helper: runs `code` in a fresh Web Worker and invokes
 * `onChunk` for each stdout/stderr chunk as it is produced (until the byte
 * cap — chunks past the cap are not delivered), resolving to the final
 * {@link ExecuteResult}. Not part of the {@link SandboxBackend} contract.
 *
 * Same isolation caveats as {@link webWorkerBackend}: thread + DOM only;
 * **not** a network/filesystem boundary and **not** WebContainer.
 */
export function runStreaming(
  code: string,
  onChunk: (chunk: WebStreamChunk) => void,
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const startTime = Date.now()
  const language = options.language ?? 'javascript'
  if (language !== 'javascript' && language !== 'python') {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `ExecuteOptions.language must be "javascript" or "python" (received ${JSON.stringify(language)})`,
    })
  }
  const timeout = options.timeout ?? 30_000
  assertPositiveTimeout(timeout, 'ExecuteOptions.timeout')
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  assertPositiveBytes(maxOutputBytes, 'ExecuteOptions.maxOutputBytes')

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
  const state: CaptureState = {
    stdout: '',
    stderr: '',
    totalBytes: { n: 0 },
    truncated: false,
    maxOutputBytes,
  }

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
        stdout: state.stdout.trimEnd(),
        stderr:
          (state.stderr ? state.stderr.trimEnd() + '\n' : '') +
          `Sandbox execution timed out after ${timeout}ms`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
      })
    }, timeout)

    handle.worker.onmessage = (event: { data: unknown }): void => {
      const msg = event.data
      if (!isOutbound(msg)) return
      if (msg.type === 'chunk') {
        const accepted = applyChunk(state, msg.stream, msg.data)
        if (accepted.length > 0) {
          onChunk({ stream: msg.stream, data: accepted })
        }
        return
      }
      finish({
        stdout: state.stdout.trimEnd(),
        stderr: finalStderr(state),
        exitCode: normalizeExitCode(msg.exitCode),
        durationMs: Date.now() - startTime,
      })
    }

    handle.worker.onerror = (event: { message?: string }): void => {
      finish({
        stdout: state.stdout.trimEnd(),
        stderr:
          (state.stderr ? state.stderr.trimEnd() + '\n' : '') +
          (event.message ?? 'Worker error'),
        exitCode: 1,
        durationMs: Date.now() - startTime,
      })
    }

    handle.worker.postMessage({ code })
  })
}
