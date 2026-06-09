import type { ToolDefinition } from '@agentskit/core'
import { airtableIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/airtable). */
export interface AirtableConfig extends HttpToolOptions {
  /** Personal access token (https://airtable.com/create/tokens). */
  apiKey: string
  /** Base id, e.g. `app1234567890ABCD`. */
  baseId: string
}

function cfg(config: AirtableConfig): ProjectionConfig {
  return {
    credential: config.apiKey,
    baseUrl: config.baseUrl ?? `https://api.airtable.com/v0/${config.baseId}/`,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function airtableListRecords(config: AirtableConfig): ToolDefinition {
  return toToolDefinitions(airtableIntegration, cfg(config)).find((t) => t.name === 'airtable_list_records')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function airtableCreateRecord(config: AirtableConfig): ToolDefinition {
  return toToolDefinitions(airtableIntegration, cfg(config)).find((t) => t.name === 'airtable_create_record')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function airtable(config: AirtableConfig): ToolDefinition[] {
  return toToolDefinitions(airtableIntegration, cfg(config))
}
