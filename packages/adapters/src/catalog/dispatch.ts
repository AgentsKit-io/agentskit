import type { AdapterFactory } from '@agentskit/core'
import { openai } from '../openai'
import type { RetryOptions } from '../utils'
import { getProvider } from './loader'
import type { CatalogProvider } from './types'

export interface CatalogDispatchConfig {
  provider: string
  model: string
  apiKey: string
  /** Override the catalog base URL (e.g. proxy / self-hosted gateway). */
  baseUrl?: string
  retry?: RetryOptions
}

export class CatalogDispatchError extends Error {
  constructor(
    message: string,
    readonly code: 'UNKNOWN_PROVIDER' | 'NOT_OPENAI_COMPATIBLE' | 'NO_BASE_URL',
  ) {
    super(message)
    this.name = 'CatalogDispatchError'
  }
}

function resolveBaseUrl(provider: CatalogProvider, override?: string): string {
  const baseUrl = override ?? provider.baseUrl
  if (!baseUrl) {
    throw new CatalogDispatchError(
      `provider "${provider.id}" has no base URL in the catalog; pass baseUrl explicitly`,
      'NO_BASE_URL',
    )
  }
  return baseUrl
}

/**
 * Build a native OpenAI-compatible adapter for a catalog provider/model. This is
 * the generic dispatch path: any provider `models.dev` marks OpenAI-compatible
 * lands here without bespoke per-provider code.
 *
 * First-class providers (anthropic/openai/gemini/ollama) keep their dedicated
 * factories and are authoritative — do not route them through here.
 */
export function dispatchFromCatalog(config: CatalogDispatchConfig): AdapterFactory {
  const provider = getProvider(config.provider)
  if (!provider) {
    throw new CatalogDispatchError(
      `unknown provider "${config.provider}"`,
      'UNKNOWN_PROVIDER',
    )
  }
  if (!provider.openaiCompatible) {
    throw new CatalogDispatchError(
      `provider "${config.provider}" is not OpenAI-compatible; use its dedicated adapter factory`,
      'NOT_OPENAI_COMPATIBLE',
    )
  }
  return openai({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: resolveBaseUrl(provider, config.baseUrl),
    retry: config.retry,
  })
}
