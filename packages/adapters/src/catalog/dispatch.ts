import type { AdapterFactory } from '@agentskit/core'
import { openai, type OpenAIConfig } from '../openai'
import { getProvider } from './loader'
import type { CatalogProvider } from './types'

/**
 * Provider, model, credentials, and optional transport settings for catalog-based dispatch.
 */
export interface CatalogDispatchConfig extends OpenAIConfig {
  provider: string
  model: string
  apiKey: string
  /** Override the catalog base URL (e.g. proxy / self-hosted gateway). */
  baseUrl?: string
  /** Explicit values for catalog URL placeholders; never reads process.env. */
  env?: Record<string, string>
}

/**
 * Error raised when a catalog provider cannot be dispatched through an OpenAI-compatible adapter.
 */
export class CatalogDispatchError extends Error {
  constructor(
    message: string,
    readonly code: 'UNKNOWN_PROVIDER' | 'NOT_OPENAI_COMPATIBLE' | 'NO_BASE_URL' | 'MISSING_URL_VARIABLE',
  ) {
    super(message)
    this.name = 'CatalogDispatchError'
  }
}

function resolveBaseUrl(provider: CatalogProvider, override?: string, env: Record<string, string> = {}): string {
  const baseUrl = override ?? provider.baseUrl
  if (!baseUrl) {
    throw new CatalogDispatchError(
      `provider "${provider.id}" has no base URL in the catalog; pass baseUrl explicitly`,
      'NO_BASE_URL',
    )
  }
  return baseUrl.replace(/\$\{([A-Z_][A-Z_0-9]*)\}/g, (_match, name: string) => {
    const value = env[name]
    if (!value) throw new CatalogDispatchError(`missing catalog URL variable ${name}`, 'MISSING_URL_VARIABLE')
    return encodeURIComponent(value)
  })
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
    ...config,
    model: config.model,
    baseUrl: resolveBaseUrl(provider, config.baseUrl, config.env),
    retry: config.retry,
  })
}
