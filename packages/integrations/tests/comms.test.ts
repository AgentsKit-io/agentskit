import { describe, it, expect } from 'vitest'
import { discordIntegration } from '../src/services/discord/index'
import { gmailIntegration } from '../src/services/gmail/index'
import { twilioIntegration } from '../src/services/twilio/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

function fakeFetch(handler: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {})) as typeof globalThis.fetch
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const ctx = (name: string) => ({ messages: [], call: { id: '1', name, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, args: Record<string, unknown>) => t.execute!(args, ctx(t.name))

describe('discord', () => {
  it('valid + posts a message', async () => {
    expect(() => assertValidIntegration(discordIntegration)).not.toThrow()
    let auth = ''
    let url = ''
    const fetch = fakeFetch((u, init) => {
      url = u
      auth = String((init.headers as Record<string, string>).authorization)
      return json({ id: 'm1', channel_id: 'c1' })
    })
    const [post] = toToolDefinitions(discordIntegration, { credential: 'tok', fetch })
    expect(await run(post, { channel_id: 'c1', content: 'hi' })).toEqual({ id: 'm1', channel_id: 'c1' })
    expect(url).toContain('/channels/c1/messages')
    expect(auth).toBe('Bot tok')
  })
})

describe('gmail', () => {
  it('valid + lists and sends with userId from config', async () => {
    expect(() => assertValidIntegration(gmailIntegration)).not.toThrow()
    const urls: string[] = []
    const fetch = fakeFetch((u) => {
      urls.push(u)
      return json(u.includes('/send') ? { id: 'x', threadId: 't' } : { messages: [{ id: 'a', threadId: 'b' }] })
    })
    const tools = toToolDefinitions(gmailIntegration, { credential: 'at', config: { userId: 'bob@x.io' }, fetch })
    const list = tools.find((t) => t.name === 'gmail_list_messages')!
    const send = tools.find((t) => t.name === 'gmail_send_email')!
    expect(await run(list, { q: 'is:unread' })).toEqual([{ id: 'a', threadId: 'b' }])
    expect(await run(send, { to: 'a@x.io', subject: 's', body: 'b' })).toEqual({ id: 'x', threadId: 't' })
    expect(urls[0]).toContain('/users/bob@x.io/messages')
    expect(urls[1]).toContain('/users/bob@x.io/messages/send')
  })
})

describe('twilio', () => {
  const tw = { accountSid: 'AC1', authToken: 'tok', fromNumber: '+14155550100' }
  it('valid + sends form-encoded SMS with Basic auth', async () => {
    expect(() => assertValidIntegration(twilioIntegration)).not.toThrow()
    let body = ''
    let auth = ''
    let url = ''
    const fetch = fakeFetch((u, init) => {
      url = u
      body = String(init.body)
      auth = String((init.headers as Record<string, string>).Authorization)
      return json({ sid: 'SM1', status: 'queued' })
    })
    const [sms] = toToolDefinitions(twilioIntegration, { config: tw, fetch })
    expect(await run(sms, { to: '+14155550111', body: 'hello' })).toEqual({ sid: 'SM1', status: 'queued' })
    expect(url).toContain('/Accounts/AC1/Messages.json')
    expect(body).toContain('To=%2B14155550111')
    expect(auth).toMatch(/^Basic /)
  })
  it('rejects non-E.164 numbers', async () => {
    const fetch = fakeFetch(() => json({}))
    const [sms] = toToolDefinitions(twilioIntegration, { config: tw, fetch })
    await expect(run(sms, { to: '5551234', body: 'x' })).rejects.toThrow(/E.164/)
  })
  it('throws on Twilio error response', async () => {
    const fetch = fakeFetch(() => json({ code: 21211, message: 'invalid To' }, 400))
    const [sms] = toToolDefinitions(twilioIntegration, { config: tw, fetch })
    await expect(run(sms, { to: '+14155550111', body: 'x' })).rejects.toThrow(/21211/)
  })
})
