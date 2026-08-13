import { describe, expect, it } from 'vitest'
import { discordIntegration } from '../src/services/discord/index'
import { gmailIntegration } from '../src/services/gmail/index'
import { slackIntegration } from '../src/services/slack/index'
import { telegramIntegration } from '../src/services/telegram/index'
import { whatsappIntegration } from '../src/services/whatsapp/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import type { ToolDefinition } from '@agentskit/core'

function fakeFetch(handler: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init ?? {})) as typeof globalThis.fetch
}

function run(tool: ToolDefinition, args: Record<string, unknown>): Promise<unknown> {
  return tool.execute!(args, { messages: [], call: { id: 'synthetic', name: tool.name, args, status: 'running' } })
}

describe('communication transport contract probes', () => {
  it('routes Slack and Discord through auth-bound JSON HTTP', async () => {
    const seen: Array<{ url: string; headers: Headers }> = []
    const fetch = fakeFetch((url, init) => {
      seen.push({ url, headers: new Headers(init.headers) })
      if (new URL(url).hostname === 'slack.com') return new Response(JSON.stringify({ ok: true, ts: '1.2' }), { headers: { 'content-type': 'application/json' } })
      return new Response(JSON.stringify({ id: 'd1', channel_id: 'c1' }), { headers: { 'content-type': 'application/json' } })
    })
    const slack = toToolDefinitions(slackIntegration, { credential: 'slack-token', fetch }).find((tool) => tool.name === 'slack_post_message')!
    const discord = toToolDefinitions(discordIntegration, { credential: 'discord-token', fetch }).find((tool) => tool.name === 'discord_post_message')!

    await expect(run(slack, { channel: 'C1', text: 'hello' })).resolves.toEqual({ ts: '1.2' })
    await expect(run(discord, { channel_id: 'c1', content: 'hello' })).resolves.toEqual({ id: 'd1', channel_id: 'c1' })
    expect(seen[0]?.headers.get('authorization')).toBe('Bearer slack-token')
    expect(seen[1]?.headers.get('authorization')).toBe('Bot discord-token')
  })

  it('routes Telegram and WhatsApp through synthetic transports without provider calls', async () => {
    const urls: string[] = []
    const fetch = fakeFetch((url) => {
      urls.push(url)
      if (url.includes('telegram')) return new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { headers: { 'content-type': 'application/json' } })
      return new Response(JSON.stringify({ messages: [{ id: 'w1' }] }), { headers: { 'content-type': 'application/json' } })
    })
    const telegram = toToolDefinitions(telegramIntegration, { fetch, config: { token: 'telegram-token' } }).find((tool) => tool.name === 'telegram_send_message')!
    const whatsapp = toToolDefinitions(whatsappIntegration, { credential: 'whatsapp-token', fetch, config: { phoneNumberId: 'phone-1' } }).find((tool) => tool.name === 'whatsapp_send_text')!

    await expect(run(telegram, { chat_id: '42', text: 'hello' })).resolves.toEqual({ messageId: 7 })
    await expect(run(whatsapp, { to: '15551234', text: 'hello' })).resolves.toEqual({ messageId: 'w1' })
    expect(urls[0]).toContain('/bottelegram-token/sendMessage')
    expect(urls[1]).toContain('/phone-1/messages')
  })

  it('covers an OAuth action through the same transport projection', async () => {
    const fetch = fakeFetch((url, init) => {
      expect(url).toContain('/users/me/messages')
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer oauth-token')
      return new Response(JSON.stringify({ messages: [{ id: 'm1', threadId: 't1' }] }), { headers: { 'content-type': 'application/json' } })
    })
    const gmail = toToolDefinitions(gmailIntegration, { credential: 'oauth-token', fetch }).find((tool) => tool.name === 'gmail_list_messages')!
    await expect(run(gmail, { q: 'is:unread' })).resolves.toEqual([{ id: 'm1', threadId: 't1' }])
  })
})
