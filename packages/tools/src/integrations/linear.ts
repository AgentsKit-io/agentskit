import type { ToolDefinition } from '@agentskit/core'
import { linearIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/linear). */
export interface LinearConfig extends HttpToolOptions {
  apiKey: string
}

function cfg(config: LinearConfig): ProjectionConfig {
  return { credential: config.apiKey, baseUrl: config.baseUrl, headers: config.headers, timeoutMs: config.timeoutMs, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function linearSearchIssues(config: LinearConfig): ToolDefinition {
  return toToolDefinitions(linearIntegration, cfg(config)).find((t) => t.name === 'linear_search_issues')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function linearCreateIssue(config: LinearConfig): ToolDefinition {
  return toToolDefinitions(linearIntegration, cfg(config)).find((t) => t.name === 'linear_create_issue')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function linear(config: LinearConfig): ToolDefinition[] {
  return toToolDefinitions(linearIntegration, cfg(config))
}
