import { ErrorCodes, SandboxError } from '@agentskit/core'
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from './types'

/** Default combined stdout+stderr capture cap (1 MiB). */
const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576
/** Default VM lifetime when creating an E2B sandbox (5 minutes). */
const DEFAULT_VM_TIMEOUT_MS = 300_000

export interface E2BConfig {
  /** Non-empty E2B API key. */
  apiKey: string
  /**
   * VM lifetime timeout in milliseconds, mapped to `Sandbox.create({ timeoutMs })`.
   * Must be a finite number &gt; 0. Defaults to 300_000 (5 minutes).
   */
  timeout?: number
  /**
   * When true, the VM may access the internet (`allowInternetAccess: true`).
   * Defaults to **false** (deny network).
   */
  network?: boolean
  /**
   * Cap on combined stdout + stderr capture in bytes. Defaults to 1 MiB.
   * Does not change the public {@link ExecuteResult} shape.
   */
  maxOutputBytes?: number
}

interface E2BSandboxInstance {
  runCode(
    code: string,
    opts?: {
      language?: string
      onStdout?: (data: { line: string }) => void
      onStderr?: (data: { line: string }) => void
    },
  ): Promise<{
    error?: {
      name: string
      value: string
      traceback: string
    }
  }>
  kill(): Promise<void>
}

interface E2BSandboxStatic {
  create(opts: {
    apiKey: string
    timeoutMs?: number
    allowInternetAccess?: boolean
  }): Promise<E2BSandboxInstance>
}

/** @internal exported for unit tests */
export function isE2BPeerMissingError(err: unknown): boolean {
  const queue: unknown[] = [err]
  const seen = new Set<unknown>()
  while (queue.length > 0) {
    const cur = queue.shift()
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue
    seen.add(cur)
    const e = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'MODULE_NOT_FOUND') return true
    const msg = typeof e.message === 'string' ? e.message : ''
    // Only genuine module-resolution failures — never every error that mentions "@e2b".
    if (
      /Cannot find (?:module|package)/i.test(msg) &&
      (/@e2b\/code-interpreter/.test(msg) || /['"]e2b['"]/.test(msg))
    ) {
      return true
    }
    if ('cause' in e) queue.push(e.cause)
  }
  return false
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new SandboxError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `E2B ${name} must be a finite number > 0 (received ${String(value)})`,
      hint: `Pass a positive ${name} in milliseconds.`,
    })
  }
}

function appendCapped(
  current: string,
  chunk: string,
  totalBytes: { n: number },
  maxBytes: number,
  onTruncated: () => void,
): string {
  if (totalBytes.n >= maxBytes) {
    onTruncated()
    return current
  }
  const chunkBytes = Buffer.byteLength(chunk, 'utf8')
  const remaining = maxBytes - totalBytes.n
  if (chunkBytes <= remaining) {
    totalBytes.n += chunkBytes
    return current + chunk
  }
  onTruncated()
  // Binary-safe partial append: take whole UTF-8 characters within remaining bytes.
  let take = remaining
  let partial = chunk
  while (take > 0 && Buffer.byteLength(partial.slice(0, take), 'utf8') > remaining) {
    take -= 1
  }
  partial = partial.slice(0, take)
  totalBytes.n = maxBytes
  return current + partial
}

/**
 * E2B cloud backend. Lazily creates a single shared VM and reuses it across
 * `execute` calls until `dispose` or an execution timeout (which kills and
 * resets the VM so no orphan work keeps running).
 *
 * **Concurrency:** concurrent `execute` calls share one VM. Create one backend
 * per call when you need isolation.
 */
export function createE2BBackend(config: E2BConfig): SandboxBackend {
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''
  if (!apiKey) {
    throw new SandboxError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'E2B apiKey must be a non-empty string',
      hint: 'Pass a valid E2B API key from https://e2b.dev.',
    })
  }

  const vmTimeoutMs = config.timeout ?? DEFAULT_VM_TIMEOUT_MS
  assertPositiveFinite('timeout', vmTimeoutMs)

  const allowInternetAccess = config.network === true
  const defaultMaxOutputBytes = config.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  if (config.maxOutputBytes !== undefined) {
    assertPositiveFinite('maxOutputBytes', config.maxOutputBytes)
  }

  let instance: E2BSandboxInstance | null = null
  let instancePromise: Promise<E2BSandboxInstance> | null = null
  let disposed = false
  /** Generation counter so a dispose mid-init can orphan the in-flight create. */
  let generation = 0

  const resetInstance = (): void => {
    instance = null
    instancePromise = null
  }

  const killQuietly = async (sb: E2BSandboxInstance | null): Promise<void> => {
    if (!sb) return
    try {
      await sb.kill()
    } catch {
      // best-effort cleanup
    }
  }

  const getInstance = (): Promise<E2BSandboxInstance> => {
    if (disposed) {
      return Promise.reject(
        new SandboxError({
          code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
          message: 'E2B sandbox has been disposed',
          hint: 'Create a new backend; execute after dispose is not supported.',
        }),
      )
    }
    if (instance) return Promise.resolve(instance)
    if (instancePromise) return instancePromise

    const createGeneration = generation
    instancePromise = (async () => {
      try {
        let Sandbox: E2BSandboxStatic | undefined
        try {
          const mod = await import('@e2b/code-interpreter')
          Sandbox =
            (mod as { Sandbox?: E2BSandboxStatic }).Sandbox ??
            (mod as unknown as { default?: { Sandbox?: E2BSandboxStatic } }).default?.Sandbox
        } catch (err) {
          if (isE2BPeerMissingError(err)) {
            throw new SandboxError({
              code: ErrorCodes.AK_SANDBOX_PEER_MISSING,
              message:
                'Install @e2b/code-interpreter to use E2B sandbox: npm install @e2b/code-interpreter',
              hint: 'E2B is the default backend; install the optional peer or pass a custom backend.',
              cause: err,
            })
          }
          throw new SandboxError({
            code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
            message: 'Failed to load @e2b/code-interpreter',
            hint: 'Check that the package is installed and importable in this runtime.',
            cause: err,
          })
        }

        if (!Sandbox || typeof Sandbox.create !== 'function') {
          throw new SandboxError({
            code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
            message: 'Sandbox class not found in @e2b/code-interpreter',
            hint: 'The installed @e2b/code-interpreter does not export Sandbox; check version compatibility.',
          })
        }

        let sb: E2BSandboxInstance
        try {
          sb = await Sandbox.create({
            apiKey,
            timeoutMs: vmTimeoutMs,
            allowInternetAccess,
          })
        } catch (err) {
          if (err instanceof SandboxError) throw err
          throw new SandboxError({
            code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
            message: err instanceof Error ? err.message : 'E2B sandbox init failed',
            hint: 'Check apiKey validity, network access to E2B, and account quota.',
            cause: err,
          })
        }

        // Dispose raced with create — kill the orphan immediately.
        if (disposed || createGeneration !== generation) {
          await killQuietly(sb)
          throw new SandboxError({
            code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
            message: 'E2B sandbox was disposed during initialization',
            hint: 'Create a new backend after dispose.',
          })
        }

        instance = sb
        return sb
      } catch (err) {
        if (createGeneration === generation) {
          instancePromise = null
        }
        throw err
      }
    })()

    return instancePromise
  }

  return {
    async execute(code: string, options: ExecuteOptions = {}): Promise<ExecuteResult> {
      if (disposed) {
        throw new SandboxError({
          code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
          message: 'E2B sandbox has been disposed',
          hint: 'Create a new backend; execute after dispose is not supported.',
        })
      }

      const language = options.language ?? 'javascript'
      if (language !== 'javascript' && language !== 'python') {
        throw new SandboxError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `E2B language must be "javascript" or "python" (received ${JSON.stringify(language)})`,
        })
      }
      const timeout = options.timeout ?? 30_000
      assertPositiveFinite('execute timeout', timeout)

      const maxOutputBytes = options.maxOutputBytes ?? defaultMaxOutputBytes
      assertPositiveFinite('maxOutputBytes', maxOutputBytes)

      const sb = await getInstance()
      let stdout = ''
      let stderr = ''
      const totalBytes = { n: 0 }
      let truncated = false
      const markTruncated = (): void => {
        truncated = true
      }
      const startTime = Date.now()

      let timeoutHandle: ReturnType<typeof setTimeout> | null = null
      let timedOut = false
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          timedOut = true
          reject(new Error(`Sandbox execution timed out after ${timeout}ms`))
        }, timeout)
      })

      try {
        const resultPromise = sb.runCode(code, {
          language: language === 'python' ? 'python' : 'javascript',
          onStdout: (data) => {
            stdout = appendCapped(stdout, data.line + '\n', totalBytes, maxOutputBytes, markTruncated)
          },
          onStderr: (data) => {
            stderr = appendCapped(stderr, data.line + '\n', totalBytes, maxOutputBytes, markTruncated)
          },
        })

        const result = await Promise.race([resultPromise, timeoutPromise])

        let out = stdout.trimEnd()
        let err = stderr.trimEnd()
        if (result.error) {
          const executionError =
            result.error.traceback || `${result.error.name}: ${result.error.value}`
          if (!err.includes(executionError)) {
            if (err) {
              err = appendCapped(err, '\n', totalBytes, maxOutputBytes, markTruncated)
            }
            err = appendCapped(
              err,
              executionError,
              totalBytes,
              maxOutputBytes,
              markTruncated,
            ).trimEnd()
          }
        }
        if (truncated) {
          err = (err ? err + '\n' : '') + `[output truncated at ${maxOutputBytes} bytes]`
        }

        return {
          stdout: out,
          stderr: err,
          exitCode: result.error ? 1 : 0,
          durationMs: Date.now() - startTime,
        }
      } catch (err) {
        // Timeout must kill/reset the VM so work cannot continue orphaned.
        if (timedOut) {
          await killQuietly(instance)
          resetInstance()
          generation += 1
        }

        return {
          stdout: stdout.trimEnd(),
          stderr: err instanceof Error ? err.message : String(err),
          exitCode: 1,
          durationMs: Date.now() - startTime,
        }
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
      }
    },

    async dispose() {
      if (disposed) return
      disposed = true
      generation += 1
      const pending = instancePromise
      const current = instance
      resetInstance()

      // If init is in-flight, wait for it and kill whatever was created.
      if (pending) {
        try {
          const sb = await pending
          await killQuietly(sb)
        } catch {
          // init already failed or was aborted
        }
        return
      }
      await killQuietly(current)
    },
  }
}
