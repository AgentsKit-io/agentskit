import type { ToolDefinition } from '@agentskit/core'
import {
  slackIntegration,
  toToolDefinitions,
  type ProjectionConfig,
} from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/**
 * @deprecated Moved to `@agentskit/integrations` (services/slack). This shim
 * re-projects the descriptor to preserve the legacy `fn(config) => Tool[]`
 * API and will be removed in a future major.
 */
export interface SlackConfig extends HttpToolOptions {
  token: string
}

function cfg(config: SlackConfig): ProjectionConfig {
  return {
    credential: config.token,
    baseUrl: config.baseUrl,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function slackPostMessage(config: SlackConfig): ToolDefinition {
  return toToolDefinitions(slackIntegration, cfg(config)).find((t) => t.name === 'slack_post_message')!
}

/** @deprecated import from `@agentskit/integrations`. */
export function slackSearch(config: SlackConfig): ToolDefinition {
  return toToolDefinitions(slackIntegration, cfg(config)).find((t) => t.name === 'slack_search')!
}

/** @deprecated import from `@agentskit/integrations`. */
export function slack(config: SlackConfig): ToolDefinition[] {
  return toToolDefinitions(slackIntegration, cfg(config))
}
