import type { ToolDefinition } from '@agentskit/core'
import { readerIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/reader). */
export interface ReaderConfig extends HttpToolOptions {
  /** Jina Reader token (optional — public endpoint works anonymously, but rate-limited). */
  apiKey?: string
}

function cfg(config: ReaderConfig): ProjectionConfig {
  return { config: { apiKey: config.apiKey, baseUrl: config.baseUrl, headers: config.headers }, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function readerFetch(config: ReaderConfig = {}): ToolDefinition {
  return toToolDefinitions(readerIntegration, cfg(config)).find((t) => t.name === 'reader_fetch')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function reader(config: ReaderConfig = {}): ToolDefinition[] {
  return toToolDefinitions(readerIntegration, cfg(config))
}
