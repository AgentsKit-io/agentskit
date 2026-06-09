import { describe, it, expect } from 'vitest'
import { telegramIntegration } from '../src/services/telegram/index'
import { sendgridIntegration } from '../src/services/sendgrid/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('telegram', () => {
  it('valid + sends message with token in path', async () => {
    expect(() => assertValidIntegration(telegramIntegration)).not.toThrow()
    let url = ''
    const fetch = fakeFetch((u) => { url = u; return json({ ok: true, result: { message_id: 42 } }) })
    const tools = toToolDefinitions(telegramIntegration, { config: { token: 'BOT123' }, fetch })
    expect(await run(tools.find((t) => t.name === 'telegram_send_message')!, { chat_id: '@c', text: 'hi' })).toEqual({ messageId: 42 })
    expect(url).toBe('https://api.telegram.org/botBOT123/sendMessage')
    expect(await run(tools.find((t) => t.name === 'telegram_send_photo')!, { chat_id: '@c', photo: 'http://img' })).toEqual({ messageId: 42 })
  })
  it('throws on telegram ok:false', async () => {
    const fetch = fakeFetch(() => json({ ok: false, description: 'chat not found' }))
    const [send] = toToolDefinitions(telegramIntegration, { config: { token: 'B' }, fetch })
    await expect(run(send, { chat_id: 'x', text: 'y' })).rejects.toThrow(/chat not found/)
  })
})

describe('sendgrid', () => {
  it('valid + sends email (202 empty body) with Bearer', async () => {
    expect(() => assertValidIntegration(sendgridIntegration)).not.toThrow()
    let auth = ''; let body: Record<string, unknown> = {}
    const fetch = fakeFetch((_u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      body = JSON.parse(String(init.body))
      return new Response('', { status: 202 })
    })
    const [send] = toToolDefinitions(sendgridIntegration, { credential: 'SG.x', fetch })
    expect(await run(send, { to: 'a@x.io', from: 'b@x.io', subject: 's', text: 'hi' })).toEqual({ ok: true })
    expect(auth).toBe('Bearer SG.x')
    expect(body.personalizations).toEqual([{ to: [{ email: 'a@x.io' }] }])
    expect(body.content).toEqual([{ type: 'text/plain', value: 'hi' }])
  })
})
