import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource, TokenUsage } from '@agentskit/core'
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
  /**
   * Price overrides in USD per 1M tokens, keyed `provider/model` (e.g.
   * `openai/gpt-4o`); for `cliproxyapi` use `openai/<model>`. They win over the models.dev catalog table.
   */
  priceOverrides?: Record<string, { input?: number; output?: number }>
}

/** Cost of one call, attached to the `done` chunk as `metadata.cost` (a `CallCost`). */
export const MODEL_PROVIDER_COST_METADATA_KEY = 'cost'

function withCost(inner: AdapterFactory, config: ModelProviderConfig): AdapterFactory {
  // cliproxyapi serves OpenAI-compatible models: price them from the openai catalog.
  const catalogId = config.provider === 'cliproxyapi' ? 'openai' : config.provider
  return {
    capabilities: inner.capabilities,
    createSource: (request: AdapterRequest): StreamSource => {
      const source = inner.createSource(request)
      return {
        abort: () => source.abort(),
        stream: async function* () {
          let usage: TokenUsage | undefined
          for await (const chunk of source.stream()) {
            if (chunk.type === 'usage' && chunk.usage) {
              // Providers may split usage across events (e.g. Anthropic): keep the max per field.
              const promptTokens = Math.max(usage?.promptTokens ?? 0, chunk.usage.promptTokens)
              const completionTokens = Math.max(usage?.completionTokens ?? 0, chunk.usage.completionTokens)
              usage = { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }
            }
            if (chunk.type === 'done') {
              // Self-import (external in tsup) keeps the large catalog snapshot out of the main bundle.
              const { computeCallCost } = await import('@agentskit/adapters/catalog')
              const cost = computeCallCost(catalogId, config.model, usage, { priceOverrides: config.priceOverrides })
              const out: StreamChunk = { ...chunk, metadata: { ...chunk.metadata, [MODEL_PROVIDER_COST_METADATA_KEY]: cost } }
              yield out
            } else {
              yield chunk
            }
          }
        },
      }
    },
  }
}

/** Single port over OpenRouter, Anthropic, OpenAI and CLIProxyAPI. */
export function createModelProvider(config: ModelProviderConfig): AdapterFactory {
  return withCost(createRawModelProvider(config), config)
}

function createRawModelProvider(config: ModelProviderConfig): AdapterFactory {
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
