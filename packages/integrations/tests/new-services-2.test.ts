import { describe, it, expect } from 'vitest'
import { intercomIntegration } from '../src/services/intercom/index'
import { asanaIntegration } from '../src/services/asana/index'
import { calComIntegration } from '../src/services/cal-com/index'
import { pipedriveIntegration } from '../src/services/pipedrive/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('intercom', () => {
  it('valid + create/list with Bearer', async () => {
    expect(() => assertValidIntegration(intercomIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      return init.method === 'POST' ? json({ id: 'c1', email: 'a@x.io' }) : json({ data: [{ id: 'c2', email: 'b@x.io', name: 'Bob' }] })
    })
    const tools = toToolDefinitions(intercomIntegration, { credential: 'dG9r', fetch })
    expect(await run(tools.find((t) => t.name === 'intercom_create_contact')!, { email: 'a@x.io' })).toEqual({ id: 'c1', email: 'a@x.io' })
    expect(auth).toBe('Bearer dG9r')
    expect(((await run(tools.find((t) => t.name === 'intercom_list_contacts')!, {})) as unknown[]).length).toBe(1)
  })
})

describe('asana', () => {
  it('valid + data-wrapped create/list', async () => {
    expect(() => assertValidIntegration(asanaIntegration)).not.toThrow()
    let body: Record<string, unknown> = {}
    const fetch = fakeFetch((_u, init) => {
      if (init.method === 'POST') { body = JSON.parse(String(init.body)); return json({ data: { gid: 't1', name: 'Task', permalink_url: 'u' } }) }
      return json({ data: [{ gid: 't2', name: 'Other' }] })
    })
    const tools = toToolDefinitions(asanaIntegration, { credential: 'pat', fetch })
    expect(await run(tools.find((t) => t.name === 'asana_create_task')!, { name: 'Task', workspace: 'w1' })).toEqual({ id: 't1', name: 'Task', url: 'u' })
    expect((body.data as { workspace: string }).workspace).toBe('w1')
    expect(((await run(tools.find((t) => t.name === 'asana_list_tasks')!, { project: 'p1' })) as unknown[]).length).toBe(1)
  })
})

describe('cal-com', () => {
  it('valid + apiKey query on bookings/event-types', async () => {
    expect(() => assertValidIntegration(calComIntegration)).not.toThrow()
    let url = ''
    const fetch = fakeFetch((u) => { url = u; return u.includes('event-types') ? json({ event_types: [{ id: 1, title: 'Intro', slug: 'intro', length: 30 }] }) : json({ bookings: [{ id: 2, title: 'B', startTime: 't', status: 'accepted' }] }) })
    const tools = toToolDefinitions(calComIntegration, { config: { apiKey: 'cal_k' }, fetch })
    expect(((await run(tools.find((t) => t.name === 'cal_list_bookings')!, {})) as unknown[]).length).toBe(1)
    expect(url).toContain('apiKey=cal_k')
    expect(((await run(tools.find((t) => t.name === 'cal_list_event_types')!, {})) as unknown[]).length).toBe(1)
  })
})

describe('pipedrive', () => {
  it('valid + api_token query create/search', async () => {
    expect(() => assertValidIntegration(pipedriveIntegration)).not.toThrow()
    let url = ''
    const fetch = fakeFetch((u, init) => { url = u; return init.method === 'POST' ? json({ data: { id: 9, title: 'D' } }) : json({ data: { items: [{ item: { id: 5, name: 'Ann', primary_email: 'a@x.io' } }] } }) })
    const tools = toToolDefinitions(pipedriveIntegration, { config: { apiToken: 'pd_t' }, fetch })
    expect(await run(tools.find((t) => t.name === 'pipedrive_create_deal')!, { title: 'D', value: 100 })).toEqual({ id: 9, title: 'D' })
    expect(url).toContain('api_token=pd_t')
    expect(((await run(tools.find((t) => t.name === 'pipedrive_search_persons')!, { term: 'ann' })) as unknown[]).length).toBe(1)
  })
})
