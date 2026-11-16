import { describe, it, expect } from 'vitest'
import { trelloIntegration } from '../src/services/trello/index'
import { clickupIntegration } from '../src/services/clickup/index'
import '../src/services/index'
import { listIntegrations } from '../src/registry'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

describe('trello and clickup descriptors', () => {
  it('are listed by listIntegrations()', () => {
    const ids = listIntegrations().map((i) => i.name)
    expect(ids).toContain('trello')
    expect(ids).toContain('clickup')
  })

  it('trello reads boards and cards with the OAuth header', async () => {
    expect(() => assertValidIntegration(trelloIntegration)).not.toThrow()
    let auth = ''
    let url = ''
    const fetch = fakeFetch((u, init) => {
      url = u
      auth = String((init.headers as Record<string, string>).authorization)
      return u.includes('/cards') ? json([{ id: 'c1', name: 'Card', url: 'u' }]) : json([{ id: 'b1', name: 'Board' }])
    })
    const tools = toToolDefinitions(trelloIntegration, { credential: 'oauth_consumer_key="k", oauth_token="t"', fetch })
    expect(await run(tools.find((t) => t.name === 'trello_list_boards')!, {})).toEqual([{ id: 'b1', name: 'Board', url: undefined }])
    expect(auth).toBe('OAuth oauth_consumer_key="k", oauth_token="t"')
    expect(await run(tools.find((t) => t.name === 'trello_list_cards')!, { board: 'b1' })).toEqual([{ id: 'c1', name: 'Card', url: 'u' }])
    expect(url).toContain('/1/boards/b1/cards')
  })

  it('trello surfaces a typed error on 401', async () => {
    const tools = toToolDefinitions(trelloIntegration, { credential: 'bad', fetch: fakeFetch(() => json({ message: 'invalid token' }, 401)) })
    await expect(run(tools.find((t) => t.name === 'trello_list_boards')!, {})).rejects.toMatchObject({ code: 'AK_TOOL_EXEC_FAILED' })
  })

  it('clickup reads workspaces and tasks with the raw token', async () => {
    expect(() => assertValidIntegration(clickupIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      return u.includes('/task') ? json({ tasks: [{ id: 't1', name: 'Task', url: 'u' }] }) : json({ teams: [{ id: 'w1', name: 'WS' }] })
    })
    const tools = toToolDefinitions(clickupIntegration, { credential: 'pk_synthetic', fetch })
    expect(await run(tools.find((t) => t.name === 'clickup_list_workspaces')!, {})).toEqual([{ id: 'w1', name: 'WS' }])
    expect(auth).toBe('pk_synthetic')
    expect(await run(tools.find((t) => t.name === 'clickup_list_tasks')!, { list: 'l1' })).toEqual([{ id: 't1', name: 'Task', url: 'u' }])
  })

  it('clickup surfaces a typed error on 401', async () => {
    const tools = toToolDefinitions(clickupIntegration, { credential: 'bad', fetch: fakeFetch(() => json({ err: 'Token invalid' }, 401)) })
    await expect(run(tools.find((t) => t.name === 'clickup_list_workspaces')!, {})).rejects.toMatchObject({ code: 'AK_TOOL_EXEC_FAILED' })
  })
})
