import { ConfigError, ErrorCodes, ToolError } from '@agentskit/core'
import { composeTimeoutSignal } from '@agentskit/integrations'
import type { ToolDefinition } from '@agentskit/core'

export interface SlackToolConfig {
  webhookUrl: string
  /** Override fetch (mainly for tests). Defaults to the global `fetch`. */
  fetch?: typeof fetch
  timeoutMs?: number
  signal?: AbortSignal
}

export function slackTool(config: SlackToolConfig): ToolDefinition {
  if (!config.webhookUrl) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'slackTool: webhookUrl is required',
    })
  }
  const doFetch = config.fetch ?? fetch

  return {
    name: 'slack_send',
    description: 'Send a message to a Slack channel via an Incoming Webhook.',
    tags: ['slack', 'notify', 'webhook'],
    category: 'notification',
    requiresConfirmation: true,
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message text. Slack mrkdwn is supported.' },
        channel: { type: 'string', description: 'Channel override (only honored if your webhook allows it).' },
        username: { type: 'string', description: 'Username override (only honored if your webhook allows it).' },
      },
      required: ['text'],
    },
    execute: async (args) => {
      const text = String(args.text ?? '').trim()
      if (!text) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'slack_send: missing text',
        })
      }
      const payload: Record<string, string> = { text }
      if (typeof args.channel === 'string' && args.channel) payload.channel = args.channel
      if (typeof args.username === 'string' && args.username) payload.username = args.username

      const { signal, cleanup } = composeTimeoutSignal(config.timeoutMs ?? 20_000, config.signal)
      try {
        const response = await doFetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
          redirect: 'error',
        })
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          throw new ToolError({
            code: ErrorCodes.AK_TOOL_EXEC_FAILED,
            message: `slack_send: HTTP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`,
            hint: 'Verify the webhook URL and Slack channel configuration.',
          })
        }
        return { ok: true, status: response.status }
      } finally {
        cleanup()
      }
    },
  }
}
