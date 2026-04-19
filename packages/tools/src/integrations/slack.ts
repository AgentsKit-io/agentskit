import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface SlackConfig extends HttpToolOptions {
  token: string
}

function opts(config: SlackConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://slack.com/api',
    headers: { authorization: `Bearer ${config.token}`, ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function slackPostMessage(config: SlackConfig) {
  const base = opts(config)
  return defineTool({
    name: 'slack_post_message',
    description: 'Post a message to a Slack channel or DM.',
    schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel id or name' },
        text: { type: 'string' },
        thread_ts: { type: 'string', description: 'Timestamp of parent message to reply to (optional)' },
      },
      required: ['channel', 'text'],
    } as const,
    async execute({ channel, text, thread_ts }) {
      const result = await httpJson<{ ok: boolean; ts?: string; error?: string }>(base, {
        method: 'POST',
        path: '/chat.postMessage',
        body: { channel, text, thread_ts },
      })
      if (!result.ok) throw new Error(`slack: ${result.error ?? 'unknown error'}`)
      return { ts: result.ts }
    },
  })
}

export function slackSearch(config: SlackConfig) {
  const base = opts(config)
  return defineTool({
    name: 'slack_search',
    description: 'Search Slack messages across workspaces you have access to.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        count: { type: 'number' },
      },
      required: ['query'],
    } as const,
    async execute({ query, count }) {
      const result = await httpJson<{
        messages?: { matches?: Array<{ channel: { name: string }; text: string; permalink: string }> }
      }>(base, {
        method: 'GET',
        path: '/search.messages',
        query: { query: String(query), count: count ?? 10 },
      })
      return (result.messages?.matches ?? []).map(m => ({
        channel: m.channel.name,
        text: m.text,
        url: m.permalink,
      }))
    },
  })
}

export function slack(config: SlackConfig) {
  return [slackPostMessage(config), slackSearch(config)]
}
