import { ConfigError, ErrorCodes, type ToolDefinition } from '@agentskit/core'
import { pagerdutyIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/pagerduty). */
export interface PagerDutyConfig extends HttpToolOptions {
  /** Integration / routing key (Events API v2). Required for trigger/ack/resolve. */
  routingKey: string
  /** REST API token, required only for schedule queries. */
  apiToken?: string
}

function cfg(config: PagerDutyConfig): ProjectionConfig {
  return {
    config: { routingKey: config.routingKey, apiToken: config.apiToken, baseUrl: config.baseUrl, timeoutMs: config.timeoutMs },
    fetch: config.fetch,
  }
}

function pick(config: PagerDutyConfig, name: string): ToolDefinition {
  return toToolDefinitions(pagerdutyIntegration, cfg(config)).find((t) => t.name === name)!
}

/** @deprecated import from `@agentskit/integrations`. */
export function pagerdutyTrigger(config: PagerDutyConfig): ToolDefinition {
  return pick(config, 'pagerduty_trigger')
}
/** @deprecated import from `@agentskit/integrations`. */
export function pagerdutyAcknowledge(config: PagerDutyConfig): ToolDefinition {
  return pick(config, 'pagerduty_acknowledge')
}
/** @deprecated import from `@agentskit/integrations`. */
export function pagerdutyResolve(config: PagerDutyConfig): ToolDefinition {
  return pick(config, 'pagerduty_resolve')
}
/** @deprecated import from `@agentskit/integrations`. */
export function pagerdutyOncall(config: PagerDutyConfig): ToolDefinition {
  if (!config.apiToken) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'pagerduty: apiToken required for REST queries' })
  }
  return pick(config, 'pagerduty_oncall')
}
/** @deprecated import from `@agentskit/integrations`. */
export function pagerduty(config: PagerDutyConfig): ToolDefinition[] {
  const tools = [pick(config, 'pagerduty_trigger'), pick(config, 'pagerduty_acknowledge'), pick(config, 'pagerduty_resolve')]
  if (config.apiToken) tools.push(pick(config, 'pagerduty_oncall'))
  return tools
}
