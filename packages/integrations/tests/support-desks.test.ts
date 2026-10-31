import { describe, it, expect } from 'vitest'
import { ToolError } from '@agentskit/core'
import { getIntegration, listIntegrations } from '../src'
import { zendeskIntegration } from '../src/services/zendesk/index'
import { freshdeskIntegration } from '../src/services/freshdesk/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

describe('support desk catalog', () => {
  it('listIntegrations returns zendesk and freshdesk', () => {
    const names = listIntegrations().map((i) => i.name)
    expect(names).toContain('zendesk')
    expect(names).toContain('freshdesk')
    expect(getIntegration('zendesk')).toBe(zendeskIntegration)
    expect(getIntegration('freshdesk')).toBe(freshdeskIntegration)
  })
})

describe('zendesk', () => {
  const config = { subdomain: 'acme', email: 'a@x.io', apiToken: 'tok' }
  it('valid + lists tickets with Basic token auth', async () => {
    expect(() => assertValidIntegration(zendeskIntegration)).not.toThrow()
    let url = ''
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      url = u
      auth = String((init.headers as Record<string, string>).authorization)
      return json({ tickets: [{ id: 7, subject: 'Help', status: 'open', priority: null, updated_at: 't' }] })
    })
    const tools = toToolDefinitions(zendeskIntegration, { config, fetch })
    expect(await run(tools.find((t) => t.name === 'zendesk_list_tickets')!, {})).toEqual([
      { id: 7, subject: 'Help', status: 'open', priority: null, updatedAt: 't' },
    ])
    expect(url).toContain('https://acme.zendesk.com/api/v2/tickets.json')
    expect(auth).toBe(`Basic ${Buffer.from('a@x.io/token:tok').toString('base64')}`)
  })
  it('throws typed errors for bad config and HTTP failures', async () => {
    const bad = toToolDefinitions(zendeskIntegration, { config: { ...config, subdomain: 'evil.com/x' }, fetch: fakeFetch(() => json({})) })
    await expect(run(bad.find((t) => t.name === 'zendesk_list_tickets')!, {})).rejects.toBeInstanceOf(ToolError)
    const denied = toToolDefinitions(zendeskIntegration, { config, fetch: fakeFetch(() => json({ error: 'Couldn\'t authenticate you' }, 401)) })
    const err = await run(denied.find((t) => t.name === 'zendesk_get_ticket')!, { id: 1 }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ToolError)
    expect((err as ToolError).message).toContain('401')
  })
})

describe('freshdesk', () => {
  const config = { domain: 'acme', apiKey: 'key' }
  it('valid + lists tickets with Basic key:X auth', async () => {
    expect(() => assertValidIntegration(freshdeskIntegration)).not.toThrow()
    let url = ''
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      url = u
      auth = String((init.headers as Record<string, string>).authorization)
      return json([{ id: 3, subject: 'Hi', status: 2, priority: 1, updated_at: 't' }])
    })
    const tools = toToolDefinitions(freshdeskIntegration, { config, fetch })
    expect(await run(tools.find((t) => t.name === 'freshdesk_list_tickets')!, {})).toEqual([
      { id: 3, subject: 'Hi', status: 2, priority: 1, updatedAt: 't' },
    ])
    expect(url).toContain('https://acme.freshdesk.com/api/v2/tickets')
    expect(auth).toBe(`Basic ${Buffer.from('key:X').toString('base64')}`)
  })
  it('throws typed errors for missing config and HTTP failures', async () => {
    const missing = toToolDefinitions(freshdeskIntegration, { config: {}, fetch: fakeFetch(() => json({})) })
    await expect(run(missing.find((t) => t.name === 'freshdesk_get_ticket')!, { id: 1 })).rejects.toBeInstanceOf(ToolError)
    const limited = toToolDefinitions(freshdeskIntegration, { config, fetch: fakeFetch(() => json({ message: 'rate limit' }, 403)) })
    const err = await run(limited.find((t) => t.name === 'freshdesk_get_ticket')!, { id: 1 }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ToolError)
    expect((err as ToolError).message).toContain('403')
  })
})
