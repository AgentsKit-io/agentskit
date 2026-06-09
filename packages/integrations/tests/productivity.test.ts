import { describe, it, expect } from 'vitest'
import { notionIntegration } from '../src/services/notion/index'
import { airtableIntegration } from '../src/services/airtable/index'
import { confluenceIntegration } from '../src/services/confluence/index'
import { figmaIntegration } from '../src/services/figma/index'
import { googleCalendarIntegration } from '../src/services/google-calendar/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('notion', () => {
  it('valid + search/create with version header', async () => {
    expect(() => assertValidIntegration(notionIntegration)).not.toThrow()
    let ver = ''
    const fetch = fakeFetch((u, init) => {
      ver = String((init.headers as Record<string, string>)['notion-version'] ?? '')
      if (u.includes('/search')) return json({ results: [{ id: 'p1', url: 'u', object: 'page' }] })
      return json({ id: 'p2', url: 'u2' })
    })
    const tools = toToolDefinitions(notionIntegration, { credential: 'nt', fetch })
    expect(await run(tools.find((t) => t.name === 'notion_search')!, { query: 'x' })).toEqual([{ id: 'p1', url: 'u', type: 'page' }])
    expect(ver).toBe('2022-06-28')
    expect(await run(tools.find((t) => t.name === 'notion_create_page')!, { parent_page_id: 'pp', title: 'T', content: 'c' })).toEqual({ id: 'p2', url: 'u2' })
  })
})

describe('airtable', () => {
  it('valid + list/create against per-base url', async () => {
    expect(() => assertValidIntegration(airtableIntegration)).not.toThrow()
    let url = ''
    const fetch = fakeFetch((u) => { url = u; return u.match(/POST/) ? json({}) : json({ records: [{ id: 'r1', fields: { Name: 'a' } }] }) })
    const tools = toToolDefinitions(airtableIntegration, { credential: 'key', baseUrl: 'https://api.airtable.com/v0/appX/', fetch })
    const out = (await run(tools.find((t) => t.name === 'airtable_list_records')!, { table: 'My Table' })) as { records: unknown[] }
    expect(out.records).toHaveLength(1)
    expect(url).toContain('/v0/appX/My%20Table')
  })
})

describe('confluence', () => {
  it('valid + CQL search with base-url-derived link', async () => {
    expect(() => assertValidIntegration(confluenceIntegration)).not.toThrow()
    const fetch = fakeFetch((u) => u.includes('/search') ? json({ results: [{ id: 'c1', title: 't', _links: { webui: '/x' } }] }) : json({ id: 'c2', _links: { webui: '/y' } }))
    const tools = toToolDefinitions(confluenceIntegration, { baseUrl: 'https://acme.atlassian.net', headers: { authorization: 'Basic z' }, config: { baseUrl: 'https://acme.atlassian.net' }, fetch })
    const out = (await run(tools.find((t) => t.name === 'confluence_search')!, { cql: 'type=page' })) as Array<{ url: string }>
    expect(out[0].url).toBe('https://acme.atlassian.net/wiki/x')
    expect(await run(tools.find((t) => t.name === 'confluence_create_page')!, { spaceKey: 'S', title: 'T', body: '<p/>' })).toEqual({ id: 'c2', url: 'https://acme.atlassian.net/wiki/y' })
  })
})

describe('figma', () => {
  it('valid + custom token header + get/export', async () => {
    expect(() => assertValidIntegration(figmaIntegration)).not.toThrow()
    let tok = ''
    const fetch = fakeFetch((u, init) => {
      tok = String((init.headers as Record<string, string>)['x-figma-token'] ?? '')
      if (u.includes('/images/')) return json({ images: { '1:2': 'http://img' } })
      return json({ name: 'F', lastModified: 'd', document: { children: [{ id: '1', name: 'Page', type: 'CANVAS' }] } })
    })
    const tools = toToolDefinitions(figmaIntegration, { credential: 'figtok', fetch })
    const file = (await run(tools.find((t) => t.name === 'figma_get_file')!, { fileKey: 'k' })) as { topNodes: unknown[] }
    expect(file.topNodes).toHaveLength(1); expect(tok).toBe('figtok')
    expect(await run(tools.find((t) => t.name === 'figma_export_images')!, { fileKey: 'k', ids: ['1:2'] })).toEqual({ '1:2': 'http://img' })
  })
})

describe('google-calendar', () => {
  it('valid + list/create against configured calendar', async () => {
    expect(() => assertValidIntegration(googleCalendarIntegration)).not.toThrow()
    let url = ''
    const fetch = fakeFetch((u) => { url = u; return u.includes('events') && !u.includes('?') === false && u.match(/timeMin/) ? json({ items: [{ id: 'e1', summary: 's', start: { dateTime: 't' }, htmlLink: 'u' }] }) : json({ id: 'e2', htmlLink: 'u2' }) })
    const tools = toToolDefinitions(googleCalendarIntegration, { credential: 'at', config: { calendarId: 'team@x.io' }, fetch })
    const out = (await run(tools.find((t) => t.name === 'calendar_list_events')!, {})) as unknown[]
    expect(out).toHaveLength(1); expect(url).toContain('/calendars/team%40x.io/events')
    expect(await run(tools.find((t) => t.name === 'calendar_create_event')!, { summary: 's', start: 'a', end: 'b' })).toEqual({ id: 'e2', url: 'u2' })
  })
})
