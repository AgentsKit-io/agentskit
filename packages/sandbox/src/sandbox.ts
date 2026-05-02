import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from './types'
import { createE2BBackend, type E2BConfig } from './e2b-backend'

export interface SandboxConfig {
  apiKey?: string
  backend?: SandboxBackend
  language?: 'javascript' | 'python'
  timeout?: number
  network?: boolean
  memoryLimit?: string
}

export interface Sandbox {
  execute(code: string, options?: ExecuteOptions): Promise<ExecuteResult>
  dispose(): Promise<void>
}

export function createSandbox(config: SandboxConfig = {}): Sandbox {
  const defaults: ExecuteOptions = {
    language: config.language ?? 'javascript',
    timeout: config.timeout ?? 30_000,
    network: config.network ?? false,
    memoryLimit: config.memoryLimit ?? '50MB',
  }

  let backend: SandboxBackend | null = config.backend ?? null

  const getBackend = (): SandboxBackend => {
    if (backend) return backend

    if (!config.apiKey) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message:
          'Sandbox requires either an apiKey (for E2B) or a custom backend. ' +
          'Provide apiKey or pass a SandboxBackend via the backend option.',
      })
    }

    backend = createE2BBackend({
      apiKey: config.apiKey,
      timeout: defaults.timeout,
    })

    return backend
  }

  return {
    async execute(code: string, options: ExecuteOptions = {}): Promise<ExecuteResult> {
      const mergedOptions: ExecuteOptions = {
        ...defaults,
        ...options,
      }

      return await getBackend().execute(code, mergedOptions)
    },

    async dispose(): Promise<void> {
      await backend?.dispose?.()
      backend = null
    },
  }
}
