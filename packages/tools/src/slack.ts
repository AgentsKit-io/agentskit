import type { ToolDefinition } from '@agentskit/core'

export interface SlackToolConfig {
  webhookUrl: string
  /** Override fetch (mainly for tests). Defaults to the global `fetch`. */
  fetch?: typeof fetch
}

export function slackTool(config: SlackToolConfig): ToolDefinition {
  if (!config.webhookUrl) throw new Error('slackTool: webhookUrl is required')
  const doFetch = config.fetch ?? fetch

  return {
    name: 'slack_send',
    description: 'Send a message to a Slack channel via an Incoming Webhook.',
    tags: ['slack', 'notify', 'webhook'],
    category: 'notification',
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
      if (!text) throw new Error('slack_send: missing text')
      const payload: Record<string, string> = { text }
      if (typeof args.channel === 'string' && args.channel) payload.channel = args.channel
      if (typeof args.username === 'string' && args.username) payload.username = args.username

      const response = await doFetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return { ok: response.ok, status: response.status }
    },
  }
}
