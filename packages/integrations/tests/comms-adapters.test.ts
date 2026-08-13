import { describe, it, expect } from 'vitest'
import { emailIntegration } from '../src/services/email/index'
import { teamsIntegration } from '../src/services/teams/index'
import { adaptiveCard, messageCard } from '../src/services/teams/cards'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (name: string) => ({ messages: [], call: { id: '1', name, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, args: Record<string, unknown>) => t.execute!(args, ctx(t.name))
function fakeFetch(handler: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {})) as typeof globalThis.fetch
}

describe('email', () => {
  it('valid descriptor', () => expect(() => assertValidIntegration(emailIntegration)).not.toThrow())

  it('sends via injected transport', async () => {
    const sent: unknown[] = []
    const transport = { send: async (m: unknown) => { sent.push(m); return { messageId: 'mid', accepted: ['a@x.io'] } } }
    const [send] = toToolDefinitions(emailIntegration, { config: { transport } })
    const out = await run(send, { from: 'me@x.io', to: 'a@x.io', subject: 's', text: 'hi' })
    expect(out).toEqual({ messageId: 'mid', accepted: ['a@x.io'], rejected: [] })
    expect(sent).toHaveLength(1)
  })

  it('throws without transport and without body', async () => {
    const [send] = toToolDefinitions(emailIntegration, { config: {} })
    await expect(run(send, { from: 'm', to: 'a', subject: 's', text: 'x' })).rejects.toThrow(/no SMTP transport/)
    const [send2] = toToolDefinitions(emailIntegration, { config: { transport: { send: async () => ({ messageId: 'x' }) } } })
    await expect(run(send2, { from: 'm', to: 'a', subject: 's' })).rejects.toThrow(/text or html/)
  })

  it('fetches via injected imap client', async () => {
    const imap = { fetch: async () => [{ id: '1', from: 'a', to: ['b'], subject: 's', date: 'd' }] }
    const fetchTool = toToolDefinitions(emailIntegration, { config: { imap } }).find((t) => t.name === 'email_fetch')!
    const out = (await run(fetchTool, { limit: 10 })) as { count: number }
    expect(out.count).toBe(1)
    const noImap = toToolDefinitions(emailIntegration, { config: {} }).find((t) => t.name === 'email_fetch')!
    await expect(run(noImap, {})).rejects.toThrow(/no IMAP client/)
  })
})

describe('teams', () => {
  it('valid + card builders', () => {
    expect(() => assertValidIntegration(teamsIntegration)).not.toThrow()
    expect(adaptiveCard({ title: 'T', text: 'x', facts: [{ title: 'a', value: 'b' }] }).content.type).toBe('AdaptiveCard')
    expect(messageCard({ title: 'T' }).content['@type']).toBe('MessageCard')
  })

  it('posts via webhook', async () => {
    let url = ''
    const fetch = fakeFetch((u) => { url = u; return new Response('', { status: 200 }) })
    const tool = toToolDefinitions(teamsIntegration, {
      config: { webhook: { webhookUrl: 'https://teams.example/hook' } },
      fetch,
    }).find((t) => t.name === 'teams_send_webhook')!
    expect(await run(tool, { text: 'hello' })).toEqual({ ok: true, status: 200 })
    expect(url).toBe('https://teams.example/hook')
    const noHook = toToolDefinitions(teamsIntegration, { config: {}, fetch }).find((t) => t.name === 'teams_send_webhook')!
    await expect(run(noHook, { text: 'x' })).rejects.toThrow(/no webhookUrl/)
  })

  it('propagates caller cancellation to the webhook transport', async () => {
    const controller = new AbortController()
    let seenSignal: AbortSignal | undefined
    const fetch = fakeFetch((_url, init) => {
      seenSignal = init.signal
      controller.abort()
      return new Response('', { status: 200 })
    })
    const tool = toToolDefinitions(teamsIntegration, {
      config: { webhook: { webhookUrl: 'https://teams.example/hook' } },
      fetch,
      signal: controller.signal,
    }).find((t) => t.name === 'teams_send_webhook')!
    await run(tool, { text: 'hello' })
    expect(seenSignal).toBeDefined()
    expect(seenSignal?.aborted).toBe(true)
  })

  it('sends via bot client', async () => {
    let seenSignal: AbortSignal | undefined
    const client = { send: async (message: { signal?: AbortSignal }) => { seenSignal = message.signal; return { id: 'a1', conversationId: 'c1' } } }
    const signal = new AbortController().signal
    const tool = toToolDefinitions(teamsIntegration, { config: { bot: { client } }, signal }).find((t) => t.name === 'teams_send_bot')!
    expect(await run(tool, { conversation_id: 'c1', text: 'hi' })).toEqual({ id: 'a1', conversationId: 'c1' })
    expect(seenSignal).toBe(signal)
    const noBot = toToolDefinitions(teamsIntegration, { config: {} }).find((t) => t.name === 'teams_send_bot')!
    await expect(run(noBot, { conversation_id: 'c1', text: 'x' })).rejects.toThrow(/no bot client/)
  })
})
