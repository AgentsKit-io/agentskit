import type { ToolDefinition } from '@agentskit/core'
import { hubspotIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/hubspot). */
export interface HubspotConfig extends HttpToolOptions {
  /** Private app access token. */
  accessToken: string
}

function cfg(config: HubspotConfig): ProjectionConfig {
  return { credential: config.accessToken, baseUrl: config.baseUrl, headers: config.headers, timeoutMs: config.timeoutMs, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function hubspotSearchContacts(config: HubspotConfig): ToolDefinition {
  return toToolDefinitions(hubspotIntegration, cfg(config)).find((t) => t.name === 'hubspot_search_contacts')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function hubspotCreateDeal(config: HubspotConfig): ToolDefinition {
  return toToolDefinitions(hubspotIntegration, cfg(config)).find((t) => t.name === 'hubspot_create_deal')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function hubspot(config: HubspotConfig): ToolDefinition[] {
  return toToolDefinitions(hubspotIntegration, cfg(config))
}
