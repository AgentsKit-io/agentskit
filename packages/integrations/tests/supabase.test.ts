import { describe, it, expect } from 'vitest'
import { listIntegrations } from '../src/registry'
import { supabaseIntegration } from '../src/services/supabase/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

describe('supabase', () => {
  it('is valid, read-only, and listed', async () => {
    expect(() => assertValidIntegration(supabaseIntegration)).not.toThrow()
    await import('../src')
    expect(listIntegrations().map((i) => i.name)).toContain('supabase')
    expect(supabaseIntegration.actions.every((a) => a.sideEffect === 'read')).toBe(true)
  })

  it('lists projects with Bearer auth against the management API', async () => {
    let url = ''
    let auth = ''
    const fetch = (async (u: RequestInfo | URL, init?: RequestInit) => {
      url = String(u)
      auth = String((init?.headers as Record<string, string>).authorization)
      return json([{ id: 'abcdefghijklmnopqrst', name: 'demo', organization_id: 'org1', region: 'us-east-1', status: 'ACTIVE_HEALTHY', created_at: 't', database: { host: 'secret' } }])
    }) as typeof globalThis.fetch
    const tools = toToolDefinitions(supabaseIntegration, { credential: 'sbp_synthetic', fetch })
    const out = await run(tools.find((t) => t.name === 'supabase_list_projects')!, {})
    expect(out).toEqual([{ ref: 'abcdefghijklmnopqrst', name: 'demo', organizationId: 'org1', region: 'us-east-1', status: 'ACTIVE_HEALTHY', createdAt: 't' }])
    expect(url).toBe('https://api.supabase.com/v1/projects')
    expect(auth).toBe('Bearer sbp_synthetic')
  })

  it('gets a project and rejects a malformed ref without a request', async () => {
    let calls = 0
    const fetch = (async () => { calls += 1; return json({ id: 'abcdefghijklmnopqrst', name: 'demo' }) }) as typeof globalThis.fetch
    const tools = toToolDefinitions(supabaseIntegration, { credential: 'sbp_synthetic', fetch })
    const get = tools.find((t) => t.name === 'supabase_get_project')!
    expect(await run(get, { ref: 'abcdefghijklmnopqrst' })).toMatchObject({ ref: 'abcdefghijklmnopqrst', name: 'demo' })
    await expect(run(get, { ref: '../organizations' })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    expect(calls).toBe(1)
  })

  it('surfaces a typed error on an unauthorized token', async () => {
    const fetch = (async () => json({ message: 'Unauthorized' }, 401)) as typeof globalThis.fetch
    const tools = toToolDefinitions(supabaseIntegration, { credential: 'bad', fetch })
    await expect(run(tools.find((t) => t.name === 'supabase_list_projects')!, {})).rejects.toMatchObject({ code: 'AK_TOOL_EXEC_FAILED' })
  })
})
