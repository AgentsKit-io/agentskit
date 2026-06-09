import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

export const slackPostMessage = defineAction({
  name: 'slack_post_message',
  description: 'Post a message to a Slack channel or DM.',
  sideEffect: 'external',
  sendCapability: 'chat.postMessage',
  schema: {
    type: 'object',
    properties: {
      channel: { type: 'string', description: 'Channel id or name' },
      text: { type: 'string' },
      thread_ts: { type: 'string', description: 'Timestamp of parent message to reply to (optional)' },
    },
    required: ['channel', 'text'],
  },
  async execute(args, { http }) {
    const result = await http<{ ok: boolean; ts?: string; error?: string }>({
      method: 'POST',
      path: '/chat.postMessage',
      body: { channel: args.channel, text: args.text, thread_ts: args.thread_ts },
    })
    if (!result.ok) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `slack: ${result.error ?? 'unknown error'}`,
        hint: 'Slack returned ok:false; verify channel id, token scope, and rate limits.',
      })
    }
    return { ts: result.ts }
  },
})

export const slackSearch = defineAction({
  name: 'slack_search',
  description: 'Search Slack messages across workspaces you have access to.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      count: { type: 'number' },
    },
    required: ['query'],
  },
  async execute(args, { http }) {
    const result = await http<{
      messages?: { matches?: Array<{ channel: { name: string }; text: string; permalink: string }> }
    }>({
      method: 'GET',
      path: '/search.messages',
      query: { query: String(args.query), count: (args.count as number) ?? 10 },
    })
    return (result.messages?.matches ?? []).map((m) => ({
      channel: m.channel.name,
      text: m.text,
      url: m.permalink,
    }))
  },
})

export const slackActions = [slackPostMessage, slackSearch]
