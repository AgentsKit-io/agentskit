import type { ToolDefinition } from '@agentskit/core'
import { confluenceIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/confluence). */
export interface ConfluenceConfig extends HttpToolOptions {
  /** Atlassian site root, e.g. `https://my-org.atlassian.net`. */
  baseUrl: string
  email: string
  apiToken: string
}

function cfg(config: ConfluenceConfig): ProjectionConfig {
  const auth = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`
  return {
    baseUrl: config.baseUrl,
    headers: { authorization: auth, ...config.headers },
    config: { baseUrl: config.baseUrl },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function confluenceSearch(config: ConfluenceConfig): ToolDefinition {
  return toToolDefinitions(confluenceIntegration, cfg(config)).find((t) => t.name === 'confluence_search')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function confluenceCreatePage(config: ConfluenceConfig): ToolDefinition {
  return toToolDefinitions(confluenceIntegration, cfg(config)).find((t) => t.name === 'confluence_create_page')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function confluence(config: ConfluenceConfig): ToolDefinition[] {
  return toToolDefinitions(confluenceIntegration, cfg(config))
}
