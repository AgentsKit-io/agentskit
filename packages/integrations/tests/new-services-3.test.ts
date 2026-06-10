import { describe, it, expect } from 'vitest'
import { calendlyIntegration } from '../src/services/calendly/index'
import { dropboxIntegration } from '../src/services/dropbox/index'
import { boxIntegration } from '../src/services/box/index'
import { baserowIntegration } from '../src/services/baserow/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('calendly', () => {
  it('valid + me + list event types (Bearer)', async () => {
    expect(() => assertValidIntegration(calendlyIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      return u.includes('/users/me')
        ? json({ resource: { uri: 'https://cal/u/1', name: 'Ana', email: 'a@x.io', scheduling_url: 'su' } })
        : json({ collection: [{ uri: 'et1', name: 'Intro', slug: 'intro', duration: 30, active: true }] })
    })
    const tools = toToolDefinitions(calendlyIntegration, { credential: 'cd', fetch })
    expect((await run(tools.find((t) => t.name === 'calendly_me')!, {}) as { uri: string }).uri).toBe('https://cal/u/1')
    expect(auth).toBe('Bearer cd')
    expect(((await run(tools.find((t) => t.name === 'calendly_list_event_types')!, { user: 'https://cal/u/1' })) as unknown[]).length).toBe(1)
  })
})

describe('dropbox', () => {
  it('valid + list/create folder (JSON-RPC, Bearer)', async () => {
    expect(() => assertValidIntegration(dropboxIntegration)).not.toThrow()
    const fetch = fakeFetch((u) => u.includes('create_folder')
      ? json({ metadata: { id: 'id:9', name: '2026', path_display: '/reports/2026' } })
      : json({ entries: [{ '.tag': 'folder', name: 'reports', path_display: '/reports', id: 'id:1' }] }))
    const tools = toToolDefinitions(dropboxIntegration, { credential: 'dbx', fetch })
    expect(((await run(tools.find((t) => t.name === 'dropbox_list_folder')!, { path: '' })) as unknown[]).length).toBe(1)
    expect(await run(tools.find((t) => t.name === 'dropbox_create_folder')!, { path: '/reports/2026' })).toEqual({ id: 'id:9', name: '2026', path: '/reports/2026' })
  })
})

describe('box', () => {
  it('valid + list items / create folder (Bearer)', async () => {
    expect(() => assertValidIntegration(boxIntegration)).not.toThrow()
    let url = ''
    const fetch = fakeFetch((u, init) => { url = u; return init.method === 'POST' ? json({ id: '99', name: 'New' }) : json({ entries: [{ type: 'file', id: '1', name: 'a.txt' }] }) })
    const tools = toToolDefinitions(boxIntegration, { credential: 'box', fetch })
    expect(((await run(tools.find((t) => t.name === 'box_list_items')!, { folder_id: '0' })) as unknown[]).length).toBe(1)
    expect(url).toContain('/folders/0/items')
    expect(await run(tools.find((t) => t.name === 'box_create_folder')!, { name: 'New' })).toEqual({ id: '99', name: 'New' })
  })
})

describe('baserow', () => {
  it('valid + list/create rows with Token header', async () => {
    expect(() => assertValidIntegration(baserowIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((_u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      return init.method === 'POST' ? json({ id: 7 }) : json({ count: 1, results: [{ id: 1, Name: 'x' }] })
    })
    const tools = toToolDefinitions(baserowIntegration, { credential: 'brk', fetch })
    const out = (await run(tools.find((t) => t.name === 'baserow_list_rows')!, { table_id: 42 })) as { count: number }
    expect(out.count).toBe(1); expect(auth).toBe('Token brk')
    expect(await run(tools.find((t) => t.name === 'baserow_create_row')!, { table_id: 42, fields: { Name: 'y' } })).toEqual({ id: 7 })
  })
})
