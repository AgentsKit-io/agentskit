import { describe, it, expect } from 'vitest'
import { googleDriveIntegration } from '../src/services/google-drive/index'
import { assemblyaiIntegration } from '../src/services/assemblyai/index'
import { attioIntegration } from '../src/services/attio/index'
import { apolloIntegration } from '../src/services/apollo/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('google-drive', () => {
  it('valid + oauth2 Bearer + list/create folder', async () => {
    expect(() => assertValidIntegration(googleDriveIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      return init.method === 'POST' ? json({ id: 'f1', name: 'Reports' }) : json({ files: [{ id: 'x', name: 'doc', mimeType: 'text/plain' }] })
    })
    const tools = toToolDefinitions(googleDriveIntegration, { credential: 'ya29', fetch })
    expect(((await run(tools.find((t) => t.name === 'drive_list_files')!, {})) as unknown[]).length).toBe(1)
    expect(auth).toBe('Bearer ya29')
    expect(await run(tools.find((t) => t.name === 'drive_create_folder')!, { name: 'Reports' })).toEqual({ id: 'f1', name: 'Reports' })
  })
})

describe('assemblyai', () => {
  it('valid + raw-key Authorization + submit/get', async () => {
    expect(() => assertValidIntegration(assemblyaiIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      return u.includes('/transcript/') ? json({ id: 't1', status: 'completed', text: 'hello' }) : json({ id: 't1', status: 'queued' })
    })
    const tools = toToolDefinitions(assemblyaiIntegration, { credential: 'aai_key', fetch })
    expect(await run(tools.find((t) => t.name === 'assemblyai_transcribe')!, { audio_url: 'http://a.mp3' })).toEqual({ id: 't1', status: 'queued' })
    expect(auth).toBe('aai_key')
    expect((await run(tools.find((t) => t.name === 'assemblyai_get_transcript')!, { id: 't1' }) as { text: string }).text).toBe('hello')
  })
})

describe('attio', () => {
  it('valid + query/create records (Bearer)', async () => {
    expect(() => assertValidIntegration(attioIntegration)).not.toThrow()
    const fetch = fakeFetch((u) => u.endsWith('/records')
      ? json({ data: { id: { record_id: 'r9' } } })
      : json({ data: [{ id: { record_id: 'r1' }, values: { name: 'Acme' } }] }))
    const tools = toToolDefinitions(attioIntegration, { credential: 'att', fetch })
    expect(((await run(tools.find((t) => t.name === 'attio_query_records')!, { object: 'companies' })) as unknown[]).length).toBe(1)
    expect(await run(tools.find((t) => t.name === 'attio_create_record')!, { object: 'people', values: { name: 'Bob' } })).toEqual({ id: 'r9' })
  })
})

describe('apollo', () => {
  it('valid + X-Api-Key header search', async () => {
    expect(() => assertValidIntegration(apolloIntegration)).not.toThrow()
    let key = ''
    const fetch = fakeFetch((_u, init) => {
      key = String((init.headers as Record<string, string>)['x-api-key'])
      return json({ people: [{ id: 'p1', name: 'Ann', title: 'CTO', email: 'a@x.io' }] })
    })
    const [search] = toToolDefinitions(apolloIntegration, { credential: 'apk', fetch })
    expect(((await run(search, { q_keywords: 'cto' })) as unknown[]).length).toBe(1)
    expect(key).toBe('apk')
  })
})
