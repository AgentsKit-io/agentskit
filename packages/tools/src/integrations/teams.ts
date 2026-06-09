import { ConfigError, ErrorCodes, type ToolDefinition } from '@agentskit/core'
import {
  teamsIntegration,
  toToolDefinitions,
  type TeamsBotClient,
} from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

export { adaptiveCard, messageCard } from '@agentskit/integrations'
export type {
  TeamsAdaptiveCardAction,
  TeamsAdaptiveCard,
  TeamsMessageCard,
  TeamsBotMessage,
  TeamsBotSendResult,
  TeamsBotClient,
} from '@agentskit/integrations'

/** @deprecated Moved to `@agentskit/integrations` (services/teams). */
export interface TeamsWebhookConfig extends HttpToolOptions {
  webhookUrl: string
}

/** @deprecated */
export interface TeamsBotConfig {
  client: TeamsBotClient
}

/** @deprecated */
export interface TeamsConfig {
  webhook?: TeamsWebhookConfig
  bot?: TeamsBotConfig
}

function webhookTool(config: TeamsWebhookConfig): ToolDefinition {
  return toToolDefinitions(teamsIntegration, {
    config: { webhook: { webhookUrl: config.webhookUrl, headers: config.headers, timeoutMs: config.timeoutMs } },
    fetch: config.fetch,
  }).find((t) => t.name === 'teams_send_webhook')!
}

function botTool(config: TeamsBotConfig): ToolDefinition {
  return toToolDefinitions(teamsIntegration, { config: { bot: { client: config.client } } }).find(
    (t) => t.name === 'teams_send_bot',
  )!
}

/** @deprecated import from `@agentskit/integrations`. */
export function teamsSendWebhook(config: TeamsWebhookConfig): ToolDefinition {
  if (!config.webhookUrl) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'teamsSendWebhook: webhookUrl is required' })
  }
  return webhookTool(config)
}

/** @deprecated import from `@agentskit/integrations`. */
export function teamsSendBot(config: TeamsBotConfig): ToolDefinition {
  if (!config.client) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'teamsSendBot: client is required',
      hint: 'Provide a TeamsBotClient adapter (e.g. wrap botbuilder TurnContext.sendActivity).',
    })
  }
  return botTool(config)
}

/** @deprecated import from `@agentskit/integrations`. */
export function teams(config: TeamsConfig): ToolDefinition[] {
  const tools: ToolDefinition[] = []
  if (config.webhook) tools.push(webhookTool(config.webhook))
  if (config.bot) tools.push(botTool(config.bot))
  if (tools.length === 0) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'teams: provide at least one of `webhook` or `bot`' })
  }
  return tools
}
