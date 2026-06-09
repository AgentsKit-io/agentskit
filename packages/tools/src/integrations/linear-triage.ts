import type { ToolDefinition } from '@agentskit/core'
import { linearTriageIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/linear-triage). */
export interface LinearTriageConfig extends HttpToolOptions {
  apiKey: string
}

function cfg(config: LinearTriageConfig): ProjectionConfig {
  return { credential: config.apiKey, baseUrl: config.baseUrl, timeoutMs: config.timeoutMs, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function linearTriageList(config: LinearTriageConfig): ToolDefinition {
  return toToolDefinitions(linearTriageIntegration, cfg(config)).find((t) => t.name === 'linear_triage_list')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function linearTriageAssign(config: LinearTriageConfig): ToolDefinition {
  return toToolDefinitions(linearTriageIntegration, cfg(config)).find((t) => t.name === 'linear_triage_assign')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function linearTriage(config: LinearTriageConfig): ToolDefinition[] {
  return toToolDefinitions(linearTriageIntegration, cfg(config))
}
