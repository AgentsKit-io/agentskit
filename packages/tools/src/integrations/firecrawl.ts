import type { ToolDefinition } from '@agentskit/core'
import { firecrawlIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/firecrawl). */
export interface FirecrawlConfig extends HttpToolOptions {
  apiKey: string
}

function cfg(config: FirecrawlConfig): ProjectionConfig {
  return { credential: config.apiKey, baseUrl: config.baseUrl, headers: config.headers, timeoutMs: config.timeoutMs, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function firecrawlScrape(config: FirecrawlConfig): ToolDefinition {
  return toToolDefinitions(firecrawlIntegration, cfg(config)).find((t) => t.name === 'firecrawl_scrape')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function firecrawlCrawl(config: FirecrawlConfig): ToolDefinition {
  return toToolDefinitions(firecrawlIntegration, cfg(config)).find((t) => t.name === 'firecrawl_crawl')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function firecrawl(config: FirecrawlConfig): ToolDefinition[] {
  return toToolDefinitions(firecrawlIntegration, cfg(config))
}
