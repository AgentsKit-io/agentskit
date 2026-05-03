import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { slackAdapter } from '../src/adapter'

const SECRET = 'test-secret'
const TOKEN = 'xoxb-test'

function signed(body: string, ts = Math.floor(Date.now() / 1000)): { headers: Record<string, string>; body: string } {
  const sig =
    'v0=' + createHmac('sha256', SECRET).update(`v0:${ts}:${body}`).digest('hex')
  return {
    body,
    headers: {
      'x-slack-request-timestamp': String(ts),
      'x-slack-signature': sig,
    },
  }
}

describe('slackAdapter — verify', () => {
  it('accepts a correctly signed request', async () => {
    const a = slackAdapter({ botToken: TOKEN, signingSecret: SECRET })
    const { headers, body } = signed('{"type":"event_callback"}')
    expect(await a.verify!({ headers, body })).toBe(true)
  })

  it('rejects when signature header is missing', async () => {
    const a = slackAdapter({ botToken: TOKEN, signingSecret: SECRET })
    expect(await a.verify!({ headers: {}, body: '{}' })).toBe(false)
  })

  it('rejects when signature does not match the body', async () => {
    const a = slackAdapter({ botToken: TOKEN, signingSecret: SECRET })
    const { headers } = signed('{"a":1}')
    expect(await a.verify!({ headers, body: '{"a":2}' })).toBe(false)
  })

  it('rejects replays older than maxAgeSeconds', async () => {
    const a = slackAdapter({ botToken: TOKEN, signingSecret: SECRET, maxAgeSeconds: 60 })
    const old = Math.floor(Date.now() / 1000) - 600
    const { headers, body } = signed('{}', old)
    expect(await a.verify!({ headers, body })).toBe(false)
  })
})

describe('slackAdapter — parse', () => {
  const a = slackAdapter({ botToken: TOKEN, signingSecret: SECRET })

  it('returns null for url_verification', () => {
    const r = a.parse({ headers: {}, body: { type: 'url_verification', challenge: 'x' } })
    expect(r).toBeNull()
  })

  it('normalizes app_mention to a mention event', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'event_callback',
        event_id: 'Ev1',
        event_time: 1767225600,
        event: {
          type: 'app_mention',
          text: '<@U999> hi',
          user: 'U1',
          channel: 'C1',
          event_ts: '1735689600.000100',
        },
      },
    }) as { type: string; text: string; surface: string; user: { id: string }; receivedAt: string }
    expect(r.type).toBe('mention')
    expect(r.text).toBe('<@U999> hi')
    expect(r.surface).toBe('slack')
    expect(r.user.id).toBe('U1')
    expect(r.receivedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('normalizes plain message in a thread to a reply event', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'event_callback',
        event_id: 'Ev2',
        event: {
          type: 'message',
          text: 'replying',
          user: 'U2',
          channel: 'C1',
          ts: '2.0',
          thread_ts: '1.0',
        },
      },
    }) as { type: string; parentId: string }
    expect(r.type).toBe('reply')
    expect(r.parentId).toBe('1.0')
  })

  it('normalizes message subtype file_share to file_upload', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'event_callback',
        event_id: 'Ev3',
        event: {
          type: 'message',
          subtype: 'file_share',
          user: 'U1',
          channel: 'C1',
          files: [{ name: 'r.pdf', mimetype: 'application/pdf', url_private: 'https://x', size: 42 }],
        },
      },
    }) as { type: string; name: string; sizeBytes: number }
    expect(r.type).toBe('file_upload')
    expect(r.name).toBe('r.pdf')
    expect(r.sizeBytes).toBe(42)
  })

  it('normalizes reaction_added', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'event_callback',
        event_id: 'Ev4',
        event: {
          type: 'reaction_added',
          user: 'U1',
          reaction: 'thumbsup',
          item: { channel: 'C1', ts: '1.0' },
        },
      },
    }) as { type: string; emoji: string; added: boolean }
    expect(r.type).toBe('reaction')
    expect(r.emoji).toBe('thumbsup')
    expect(r.added).toBe(true)
  })

  it('flags bot messages via user.isBot', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'event_callback',
        event_id: 'Ev5',
        event: { type: 'message', user: 'U1', channel: 'C1', text: 'auto', bot_id: 'B1' },
      },
    }) as { user: { isBot: boolean } }
    expect(r.user.isBot).toBe(true)
  })

  it('returns null for unrecognised inner event types', () => {
    const r = a.parse({
      headers: {},
      body: { type: 'event_callback', event: { type: 'team_join' } },
    })
    expect(r).toBeNull()
  })
})

describe('slackAdapter — reply', () => {
  it('POSTs to chat.postMessage with bearer + thread_ts', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fakeFetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response(null, { status: 200 })
    }) as unknown as typeof fetch
    const a = slackAdapter({ botToken: TOKEN, signingSecret: SECRET, fetch: fakeFetch })
    await a.reply!(
      {
        type: 'reply',
        surface: 'slack',
        eventId: 'E',
        channel: { id: 'C1' },
        user: { id: 'U1' },
        threadId: '1.0',
        text: 'src',
        parentId: '1.0',
      },
      'hello world',
    )
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://slack.com/api/chat.postMessage')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.authorization).toBe(`Bearer ${TOKEN}`)
    const body = JSON.parse(String(calls[0].init.body))
    expect(body).toEqual({ channel: 'C1', text: 'hello world', thread_ts: '1.0' })
  })

  it('skips when channel id is empty', async () => {
    const fakeFetch = vi.fn() as unknown as typeof fetch
    const a = slackAdapter({ botToken: TOKEN, signingSecret: SECRET, fetch: fakeFetch })
    await a.reply!(
      { type: 'message', surface: 'slack', eventId: 'E', channel: { id: '' }, user: { id: 'U1' }, text: 'x' },
      'reply',
    )
    expect(fakeFetch).not.toHaveBeenCalled()
  })
})
