import type { ToolDefinition } from '@agentskit/core'
import { readerIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'
import { safeFetch } from '../safe-fetch'

/** @deprecated Moved to `@agentskit/integrations` (services/reader). */
export interface ReaderConfig extends HttpToolOptions {
  /** Jina Reader token (optional — public endpoint works anonymously, but rate-limited). */
  apiKey?: string
  /** Explicit policy-enforcing transport for the model-controlled URL. */
  fetchUntrusted?: typeof globalThis.fetch
}

const gatedReaderFetch: typeof globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return safeFetch(url, init ?? {})
}

function cfg(config: ReaderConfig): ProjectionConfig {
  return {
    config: { apiKey: config.apiKey, baseUrl: config.baseUrl, headers: config.headers },
    retry: config.retry,
    signal: config.signal,
    fetch: config.fetch,
    fetchUntrusted: config.fetchUntrusted ?? gatedReaderFetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function readerFetch(config: ReaderConfig = {}): ToolDefinition {
  return toToolDefinitions(readerIntegration, cfg(config)).find((t) => t.name === 'reader_fetch')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function reader(config: ReaderConfig = {}): ToolDefinition[] {
  return toToolDefinitions(readerIntegration, cfg(config))
}
