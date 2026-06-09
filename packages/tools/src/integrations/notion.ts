import type { ToolDefinition } from '@agentskit/core'
import { notionIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/notion). */
export interface NotionConfig extends HttpToolOptions {
  token: string
  /** Notion API version — pinned for predictable schema. Default 2022-06-28. */
  version?: string
}

function cfg(config: NotionConfig): ProjectionConfig {
  return {
    credential: config.token,
    baseUrl: config.baseUrl,
    headers: { ...(config.version ? { 'notion-version': config.version } : {}), ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function notionSearch(config: NotionConfig): ToolDefinition {
  return toToolDefinitions(notionIntegration, cfg(config)).find((t) => t.name === 'notion_search')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function notionCreatePage(config: NotionConfig): ToolDefinition {
  return toToolDefinitions(notionIntegration, cfg(config)).find((t) => t.name === 'notion_create_page')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function notion(config: NotionConfig): ToolDefinition[] {
  return toToolDefinitions(notionIntegration, cfg(config))
}
