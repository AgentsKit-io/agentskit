import { describe, it, expect } from 'vitest'
import { listIntegrations } from '../src/registry'
import { mondayIntegration } from '../src/services/monday/index'
import { gitlabIntegration } from '../src/services/gitlab/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

describe('monday + gitlab descriptors', () => {
  it('are valid and listed', async () => {
    expect(() => assertValidIntegration(mondayIntegration)).not.toThrow()
    expect(() => assertValidIntegration(gitlabIntegration)).not.toThrow()
    await import('../src')
    const names = listIntegrations().map((i) => i.name)
    expect(names).toContain('monday')
    expect(names).toContain('gitlab')
  })

  it('monday lists boards with the token header', async () => {
    let auth = ''
    let body = ''
    let url = ''
    const fetch = (async (u: RequestInfo | URL, init?: RequestInit) => {
      url = String(u)
      auth = String((init?.headers as Record<string, string>).authorization)
      body = String(init?.body)
      return json({ data: { boards: [{ id: '1', name: 'Roadmap', state: 'active', board_kind: 'public' }] } })
    }) as typeof globalThis.fetch
    const tools = toToolDefinitions(mondayIntegration, { credential: 'synthetic-token', fetch })
    const out = await run(tools.find((t) => t.name === 'monday_list_boards')!, {})
    expect(out).toEqual([{ id: '1', name: 'Roadmap', state: 'active', kind: 'public' }])
    expect(auth).toBe('synthetic-token')
    expect(url).toBe('https://api.monday.com/v2')
    expect(body).toContain('boards(limit: 25)')
  })

  it('monday surfaces GraphQL errors as a typed error', async () => {
    const fetch = (async () => json({ errors: [{ message: 'Not Authenticated' }] })) as typeof globalThis.fetch
    const tools = toToolDefinitions(mondayIntegration, { credential: 'bad', fetch })
    await expect(run(tools.find((t) => t.name === 'monday_list_boards')!, {})).rejects.toMatchObject({
      code: 'AK_TOOL_EXEC_FAILED',
      message: expect.stringContaining('Not Authenticated'),
    })
  })

  it('gitlab lists member projects with PRIVATE-TOKEN', async () => {
    let url = ''
    let token = ''
    const fetch = (async (u: RequestInfo | URL, init?: RequestInit) => {
      url = String(u)
      token = String((init?.headers as Record<string, string>)['private-token'])
      return json([{ id: 7, path_with_namespace: 'demo/app', web_url: 'https://gitlab.com/demo/app', default_branch: 'main', visibility: 'private' }])
    }) as typeof globalThis.fetch
    const tools = toToolDefinitions(gitlabIntegration, { credential: 'glpat-synthetic', fetch })
    const out = await run(tools.find((t) => t.name === 'gitlab_list_projects')!, { search: 'app' })
    expect(out).toEqual([{ id: 7, path: 'demo/app', url: 'https://gitlab.com/demo/app', defaultBranch: 'main', visibility: 'private' }])
    expect(url).toContain('/api/v4/projects')
    expect(url).toContain('membership=true')
    expect(token).toBe('glpat-synthetic')
  })

  it('gitlab surfaces a 401 as a typed error', async () => {
    const fetch = (async () => json({ message: '401 Unauthorized' }, 401)) as typeof globalThis.fetch
    const tools = toToolDefinitions(gitlabIntegration, { credential: 'bad', fetch })
    await expect(run(tools.find((t) => t.name === 'gitlab_list_projects')!, {})).rejects.toMatchObject({
      code: 'AK_TOOL_EXEC_FAILED',
      message: expect.stringContaining('401'),
    })
  })
})
