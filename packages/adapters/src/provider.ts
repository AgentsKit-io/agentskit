import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory } from '@agentskit/core'
import { anthropic } from './anthropic'
import { openai } from './openai'
import { openrouter } from './openrouter'
import type { RetryOptions } from './utils'

/** Providers reachable through the single model-provider port. */
export type ModelProviderId = 'openrouter' | 'anthropic' | 'openai' | 'cliproxyapi'

/** Default CLIProxyAPI local endpoint (OpenAI-compatible). */
export const CLIPROXYAPI_DEFAULT_BASE_URL = 'http://127.0.0.1:8317/v1'

/**
 * Provider-agnostic configuration. Switching provider is a config change only:
 * the returned value is always the same `AdapterFactory` shape.
 */
export interface ModelProviderConfig {
  provider: ModelProviderId
  model: string
  /** Optional for `cliproxyapi` (local proxy); required for the others. */
  apiKey?: string
  baseUrl?: string
  retry?: RetryOptions
  /** Anthropic only. */
  maxTokens?: number
}

/** Single port over OpenRouter, Anthropic, OpenAI and CLIProxyAPI. */
export function createModelProvider(config: ModelProviderConfig): AdapterFactory {
  const { provider, model, apiKey, baseUrl, retry } = config
  const requireKey = (): string => {
    if (!apiKey) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `createModelProvider: apiKey is required for provider "${provider}".`,
        hint: 'Pass apiKey in the model-provider config.',
      })
    }
    return apiKey
  }
  switch (provider) {
    case 'anthropic':
      return anthropic({ apiKey: requireKey(), model, baseUrl, retry, maxTokens: config.maxTokens })
    case 'openai':
      return openai({ apiKey: requireKey(), model, baseUrl, retry })
    case 'openrouter':
      return openrouter({ apiKey: requireKey(), model, baseUrl, retry })
    case 'cliproxyapi':
      return openai({ apiKey: apiKey ?? '', model, baseUrl: baseUrl ?? CLIPROXYAPI_DEFAULT_BASE_URL, retry })
    default:
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `createModelProvider: unknown provider "${String(provider)}".`,
        hint: 'Use one of: openrouter, anthropic, openai, cliproxyapi.',
      })
  }
}
