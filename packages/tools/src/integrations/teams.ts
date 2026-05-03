import { ConfigError, ErrorCodes, ToolError, defineTool } from '@agentskit/core'
import type { HttpToolOptions } from './http'

/**
 * Microsoft Teams integration. Two outbound paths:
 *
 *  - Incoming Webhook (no app registration required): pass `webhookUrl`.
 *    Best for one-way notifications, supports MessageCard + Adaptive Cards.
 *
 *  - Bot Framework (rich bidirectional): pass a `TeamsBotClient` adapter.
 *    botbuilder is not bundled — wrap it (or your Graph/REST client) to
 *    keep this package driver-free. Auth (app secret, certificate,
 *    managed identity) is handled inside your adapter.
 *
 * Inbound activity routing (`message`, `mentioned`, etc.) lives in
 * `@agentskit/triggers` (AgentsKitOS) — this package only owns tool
 * primitives, not long-running listeners.
 */

export interface TeamsWebhookConfig extends HttpToolOptions {
  webhookUrl: string
}

export interface TeamsBotMessage {
  /** Conversation id (channel or 1:1). */
  conversationId: string
  serviceUrl?: string
  text?: string
  /** Optional Adaptive Card or MessageCard attachment. */
  card?: TeamsAdaptiveCard | TeamsMessageCard
  /** Reply to a specific activity id (creates a thread reply). */
  replyToId?: string
}

export interface TeamsBotSendResult {
  id: string
  conversationId: string
}

export interface TeamsBotClient {
  send: (msg: TeamsBotMessage) => Promise<TeamsBotSendResult>
}

export interface TeamsBotConfig {
  client: TeamsBotClient
}

export interface TeamsConfig {
  webhook?: TeamsWebhookConfig
  bot?: TeamsBotConfig
}

export interface TeamsAdaptiveCardAction {
  type: 'Action.OpenUrl' | 'Action.Submit'
  title: string
  url?: string
  data?: Record<string, unknown>
}

export interface TeamsAdaptiveCard {
  contentType: 'application/vnd.microsoft.card.adaptive'
  content: {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json'
    type: 'AdaptiveCard'
    version: '1.5'
    body: Array<Record<string, unknown>>
    actions?: TeamsAdaptiveCardAction[]
  }
}

export interface TeamsMessageCard {
  contentType: 'application/vnd.microsoft.teams.card.o365connector'
  content: {
    '@type': 'MessageCard'
    '@context': 'https://schema.org/extensions'
    summary?: string
    themeColor?: string
    title?: string
    text?: string
  }
}

/**
 * Build a Teams Adaptive Card payload (v1.5). Keep `body` simple —
 * one TextBlock per paragraph; pass `actions` for buttons.
 */
export function adaptiveCard(input: {
  title?: string
  text?: string
  facts?: Array<{ title: string; value: string }>
  actions?: TeamsAdaptiveCardAction[]
}): TeamsAdaptiveCard {
  const body: Array<Record<string, unknown>> = []
  if (input.title) {
    body.push({ type: 'TextBlock', size: 'Large', weight: 'Bolder', text: input.title, wrap: true })
  }
  if (input.text) {
    body.push({ type: 'TextBlock', text: input.text, wrap: true })
  }
  if (input.facts && input.facts.length > 0) {
    body.push({ type: 'FactSet', facts: input.facts })
  }
  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.5',
      body,
      ...(input.actions && input.actions.length > 0 ? { actions: input.actions } : {}),
    },
  }
}

/**
 * Build a legacy O365 connector MessageCard. Simpler than Adaptive
 * Cards but still rendered by Teams Incoming Webhooks.
 */
export function messageCard(input: {
  title?: string
  text?: string
  summary?: string
  themeColor?: string
}): TeamsMessageCard {
  return {
    contentType: 'application/vnd.microsoft.teams.card.o365connector',
    content: {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: input.summary ?? input.title ?? 'Notification',
      themeColor: input.themeColor,
      title: input.title,
      text: input.text,
    },
  }
}

export function teamsSendWebhook(config: TeamsWebhookConfig) {
  if (!config.webhookUrl) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'teamsSendWebhook: webhookUrl is required',
    })
  }
  const fetchImpl = config.fetch ?? globalThis.fetch
  const timeoutMs = config.timeoutMs ?? 20_000
  return defineTool({
    name: 'teams_send_webhook',
    description: 'Post a message or Adaptive Card to a Microsoft Teams channel via Incoming Webhook.',
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Plain text body. Ignored when `card` is provided.' },
        title: { type: 'string', description: 'Convenience: wrap into a MessageCard with this title.' },
        card: {
          type: 'object',
          description: 'Pre-built Adaptive Card or MessageCard payload (use `adaptiveCard()`/`messageCard()` builders).',
        },
      },
    } as const,
    async execute(args) {
      if (!fetchImpl) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: 'teams_send_webhook: no fetch available',
          hint: 'Run on Node ≥ 18 or pass config.fetch.',
        })
      }
      const text = typeof args.text === 'string' ? args.text : undefined
      const title = typeof args.title === 'string' ? args.title : undefined
      const card = (args.card ?? undefined) as TeamsAdaptiveCard | TeamsMessageCard | undefined

      let payload: Record<string, unknown>
      if (card) {
        payload = { type: 'message', attachments: [card] }
      } else if (text || title) {
        payload = { type: 'message', attachments: [messageCard({ title, text })] }
      } else {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'teams_send_webhook: provide text, title, or card',
        })
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchImpl(config.webhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...config.headers },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          throw new ToolError({
            code: ErrorCodes.AK_TOOL_EXEC_FAILED,
            message: `teams_send_webhook: HTTP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`,
            hint: 'Verify the webhook URL is current and the channel still exists.',
          })
        }
        return { ok: true, status: response.status }
      } finally {
        clearTimeout(timer)
      }
    },
  })
}

export function teamsSendBot(config: TeamsBotConfig) {
  if (!config.client) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'teamsSendBot: client is required',
      hint: 'Provide a TeamsBotClient adapter (e.g. wrap botbuilder TurnContext.sendActivity).',
    })
  }
  const client = config.client
  return defineTool({
    name: 'teams_send_bot',
    description: 'Send a message or Adaptive Card via the configured Teams Bot Framework client.',
    schema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string' },
        service_url: { type: 'string' },
        text: { type: 'string' },
        card: { type: 'object' },
        reply_to_id: { type: 'string', description: 'Activity id to reply in-thread.' },
      },
      required: ['conversation_id'],
    } as const,
    async execute(args) {
      const text = typeof args.text === 'string' ? args.text : undefined
      const card = (args.card ?? undefined) as TeamsAdaptiveCard | TeamsMessageCard | undefined
      if (!text && !card) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'teams_send_bot: provide text or card',
        })
      }
      try {
        const result = await client.send({
          conversationId: String(args.conversation_id),
          serviceUrl: typeof args.service_url === 'string' ? args.service_url : undefined,
          text,
          card,
          replyToId: typeof args.reply_to_id === 'string' ? args.reply_to_id : undefined,
        })
        return { id: result.id, conversationId: result.conversationId }
      } catch (err) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `teams_send_bot: ${err instanceof Error ? err.message : String(err)}`,
          hint: 'Check Bot Framework credentials and that the conversation reference is still valid.',
        })
      }
    },
  })
}

export function teams(config: TeamsConfig) {
  const tools = []
  if (config.webhook) tools.push(teamsSendWebhook(config.webhook))
  if (config.bot) tools.push(teamsSendBot(config.bot))
  if (tools.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'teams: provide at least one of `webhook` or `bot`',
    })
  }
  return tools
}
