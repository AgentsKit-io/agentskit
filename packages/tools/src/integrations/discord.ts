import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface DiscordConfig extends HttpToolOptions {
  token: string
  /** `Bot <token>` header prefix. Default 'Bot'. Use 'Bearer' for OAuth tokens. */
  tokenType?: 'Bot' | 'Bearer'
}

function opts(config: DiscordConfig): HttpToolOptions {
  const prefix = config.tokenType ?? 'Bot'
  return {
    baseUrl: config.baseUrl ?? 'https://discord.com/api/v10',
    headers: { authorization: `${prefix} ${config.token}`, ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function discordPostMessage(config: DiscordConfig) {
  const base = opts(config)
  return defineTool({
    name: 'discord_post_message',
    description: 'Post a message to a Discord channel.',
    schema: {
      type: 'object',
      properties: {
        channel_id: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['channel_id', 'content'],
    } as const,
    async execute({ channel_id, content }) {
      const result = await httpJson<{ id: string; channel_id: string }>(base, {
        method: 'POST',
        path: `/channels/${channel_id}/messages`,
        body: { content },
      })
      return { id: result.id, channel_id: result.channel_id }
    },
  })
}

export function discord(config: DiscordConfig) {
  return [discordPostMessage(config)]
}
