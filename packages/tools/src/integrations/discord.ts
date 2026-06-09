import type { ToolDefinition } from '@agentskit/core'
import { discordIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/discord). */
export interface DiscordConfig extends HttpToolOptions {
  token: string
  /** `Bot <token>` header prefix. Default 'Bot'. Use 'Bearer' for OAuth tokens. */
  tokenType?: 'Bot' | 'Bearer'
}

function cfg(config: DiscordConfig): ProjectionConfig {
  return {
    credential: config.token,
    baseUrl: config.baseUrl,
    headers:
      config.tokenType === 'Bearer'
        ? { authorization: `Bearer ${config.token}`, ...config.headers }
        : config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function discordPostMessage(config: DiscordConfig): ToolDefinition {
  return toToolDefinitions(discordIntegration, cfg(config)).find((t) => t.name === 'discord_post_message')!
}

/** @deprecated import from `@agentskit/integrations`. */
export function discord(config: DiscordConfig): ToolDefinition[] {
  return toToolDefinitions(discordIntegration, cfg(config))
}
