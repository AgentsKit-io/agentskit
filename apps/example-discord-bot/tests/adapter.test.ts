import { describe, expect, it, vi } from 'vitest'
import { discordAdapter } from '../src/adapter'

const TOKEN = 'bot-token'
const PUBLIC_KEY = '0'.repeat(64)

describe('discordAdapter — verify', () => {
  it('rejects when signature headers missing', async () => {
    const a = discordAdapter({ botToken: TOKEN, publicKey: PUBLIC_KEY })
    expect(await a.verify!({ headers: {}, body: '{}' })).toBe(false)
  })

  it('rejects when signature is malformed (gracefully, no throw)', async () => {
    const a = discordAdapter({ botToken: TOKEN, publicKey: PUBLIC_KEY })
    const ok = await a.verify!({
      headers: {
        'x-signature-ed25519': 'not-hex',
        'x-signature-timestamp': '1',
      },
      body: '{}',
    })
    expect(ok).toBe(false)
  })
})

describe('discordAdapter — parse', () => {
  const a = discordAdapter({ botToken: TOKEN, publicKey: PUBLIC_KEY })

  it('returns null for PING (type 1)', () => {
    expect(a.parse({ headers: {}, body: { type: 1, id: 'I0' } })).toBeNull()
  })

  it('normalizes APPLICATION_COMMAND to mention with command + serialized options', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 2,
        id: 'I1',
        channel_id: 'C1',
        member: { user: { id: 'U1', username: 'alice' } },
        data: {
          name: 'ask',
          options: [
            { name: 'q', value: 'hello' },
            { name: 'lang', value: 'en' },
          ],
        },
      },
    }) as { type: string; command: string; text: string; user: { name: string } }
    expect(r.type).toBe('mention')
    expect(r.command).toBe('ask')
    expect(r.text).toBe('q=hello lang=en')
    expect(r.user.name).toBe('alice')
  })

  it('normalizes MESSAGE_COMPONENT (type 3) to a mention with serialized data', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 3,
        id: 'I2',
        channel_id: 'C1',
        user: { id: 'U2' },
        data: { custom_id: 'btn-yes' },
      },
    }) as { type: string; text: string }
    expect(r.type).toBe('mention')
    expect(r.text).toContain('btn-yes')
  })

  it('flags bot users via isBot', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 2,
        id: 'I3',
        channel_id: 'C1',
        user: { id: 'U3', bot: true },
        data: { name: 'noop' },
      },
    }) as { user: { isBot: boolean } }
    expect(r.user.isBot).toBe(true)
  })

  it('returns null for unknown interaction types', () => {
    expect(a.parse({ headers: {}, body: { type: 99, id: 'I4' } })).toBeNull()
  })
})

describe('discordAdapter — reply', () => {
  it('POSTs to /channels/:id/messages with Bot auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fakeFetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response(null, { status: 200 })
    }) as unknown as typeof fetch
    const a = discordAdapter({ botToken: TOKEN, publicKey: PUBLIC_KEY, fetch: fakeFetch })
    await a.reply!(
      {
        type: 'mention',
        surface: 'discord',
        eventId: 'E',
        channel: { id: 'C9' },
        user: { id: 'U1' },
        text: 'cmd',
      },
      'reply text',
    )
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://discord.com/api/v10/channels/C9/messages')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.authorization).toBe(`Bot ${TOKEN}`)
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ content: 'reply text' })
  })

  it('skips when channel is empty', async () => {
    const fakeFetch = vi.fn() as unknown as typeof fetch
    const a = discordAdapter({ botToken: TOKEN, publicKey: PUBLIC_KEY, fetch: fakeFetch })
    await a.reply!(
      { type: 'message', surface: 'discord', eventId: 'E', channel: { id: '' }, user: { id: 'U1' }, text: 'x' },
      'reply',
    )
    expect(fakeFetch).not.toHaveBeenCalled()
  })
})
