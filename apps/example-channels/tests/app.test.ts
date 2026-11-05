import { describe, expect, it, vi } from 'vitest'
import { telegramChannel } from '@agentskit/integrations'
import { createChannelApp } from '../src/app'

const update = JSON.stringify({
  update_id: 1,
  message: { message_id: 7, from: { id: 5, is_bot: false, first_name: 'Eva' }, chat: { id: 5, type: 'private' }, date: 1761700000, text: 'hello' },
})

describe('channel → agent example', () => {
  it('answers a Telegram update with the agent output', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    const channel = telegramChannel({ botToken: 'T', secretToken: 's', fetch: fetchMock as never })
    const handle = createChannelApp(channel)
    const res = await handle({ headers: { 'x-telegram-bot-api-secret-token': 's' }, rawBody: update })
    expect(res.status).toBe(200)
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ chat_id: '5', text: 'Hi from AgentsKit!' })
  })
  it('rejects a bad secret', async () => {
    const channel = telegramChannel({ botToken: 'T', secretToken: 's', fetch: vi.fn() as never })
    expect((await createChannelApp(channel)({ headers: {}, rawBody: update })).status).toBe(401)
  })
})
