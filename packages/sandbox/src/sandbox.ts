import { ConfigError, ErrorCodes, SandboxError } from '@agentskit/core'
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from './types'
import type { E2BConfig } from './e2b-backend'

const SUPPORTED_LANGUAGES = new Set(['javascript', 'python'] as const)

export interface SandboxConfig {
  apiKey?: string
  backend?: SandboxBackend
  language?: 'javascript' | 'python'
  /** Per-execute default timeout in ms. Must be finite &gt; 0. Default 30_000. */
  timeout?: number
  /** Default network access for backends that honor it. Default false. */
  network?: boolean
  /**
   * Soft resource hint for custom backends. **Not enforced** by the built-in
   * E2B or Web Worker adapters — those platforms do not expose per-instance
   * memory limits through this config. Kept for API compatibility.
   */
  memoryLimit?: string
}

export interface Sandbox {
  execute(code: string, options?: ExecuteOptions): Promise<ExecuteResult>
  dispose(): Promise<void>
}

function assertLanguage(value: unknown, label: string): asserts value is 'javascript' | 'python' {
  if (typeof value !== 'string' || !SUPPORTED_LANGUAGES.has(value as 'javascript' | 'python')) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${label} must be "javascript" or "python" (received ${JSON.stringify(value)})`,
      hint: 'Pass language: "javascript" | "python".',
    })
  }
}

function assertTimeout(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${label} must be a finite number > 0 (received ${String(value)})`,
      hint: 'Pass a positive timeout in milliseconds.',
    })
  }
  return value
}

/**
 * Create a sandbox facade over an injected backend or the default E2B backend.
 *
 * Security defaults: `network: false`, `timeout: 30_000`, language `javascript`.
 * `memoryLimit` is accepted for compatibility but is only a hint for custom
 * backends — E2B does not apply it per instance.
 */
export function createSandbox(config: SandboxConfig = {}): Sandbox {
  if (config.language !== undefined) {
    assertLanguage(config.language, 'SandboxConfig.language')
  }
  if (config.timeout !== undefined) {
    assertTimeout(config.timeout, 'SandboxConfig.timeout')
  }
  if (config.apiKey !== undefined && typeof config.apiKey === 'string' && config.apiKey.trim() === '') {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'SandboxConfig.apiKey must be a non-empty string when provided',
      hint: 'Omit apiKey and pass a custom backend, or provide a valid E2B key.',
    })
  }

  const defaults: ExecuteOptions = {
    language: config.language ?? 'javascript',
    timeout: config.timeout ?? 30_000,
    network: config.network ?? false,
    memoryLimit: config.memoryLimit ?? '50MB',
  }

  let backend: SandboxBackend | null = config.backend ?? null
  let backendPromise: Promise<SandboxBackend> | null = null
  let disposed = false

  const getBackend = async (): Promise<SandboxBackend> => {
    if (disposed) {
      throw new SandboxError({
        code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
        message: 'Sandbox has been disposed',
        hint: 'Create a new sandbox; execute after dispose is not supported.',
      })
    }
    if (backend) return backend

    if (!config.apiKey) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message:
          'Sandbox requires either an apiKey (for E2B) or a custom backend. ' +
          'Provide apiKey or pass a SandboxBackend via the backend option.',
      })
    }
    const apiKey = config.apiKey

    if (!backendPromise) {
      backendPromise = (async () => {
        const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ './e2b-backend')
        const e2bConfig: E2BConfig = {
          apiKey,
          network: defaults.network === true,
        }
        const created = mod.createE2BBackend(e2bConfig)
        if (disposed) {
          await created.dispose?.()
          throw new SandboxError({
            code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
            message: 'Sandbox was disposed during backend initialization',
            hint: 'Create a new sandbox after dispose.',
          })
        }
        backend = created
        return created
      })().catch((error: unknown) => {
        backendPromise = null
        throw error
      })
    }
    return backendPromise
  }

  return {
    async execute(code: string, options: ExecuteOptions = {}): Promise<ExecuteResult> {
      if (disposed) {
        throw new SandboxError({
          code: ErrorCodes.AK_SANDBOX_BACKEND_FAILED,
          message: 'Sandbox has been disposed',
          hint: 'Create a new sandbox; execute after dispose is not supported.',
        })
      }

      if (options.language !== undefined) {
        assertLanguage(options.language, 'ExecuteOptions.language')
      }
      if (options.timeout !== undefined) {
        assertTimeout(options.timeout, 'ExecuteOptions.timeout')
      }

      const mergedOptions: ExecuteOptions = {
        ...defaults,
        ...options,
      }

      const b = await getBackend()
      return await b.execute(code, mergedOptions)
    },

    async dispose(): Promise<void> {
      if (disposed) return
      disposed = true
      const current = backend
      const pending = backendPromise
      backend = null
      backendPromise = null
      await current?.dispose?.()
      if (pending) {
        try {
          const created = await pending
          if (created !== current) await created.dispose?.()
        } catch {
          // Initialization observes disposed and cleans up its backend.
        }
      }
    },
  }
}
