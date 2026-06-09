import { describe, it, expect } from 'vitest'
import { githubIntegration } from '../src/services/github/index'
import { githubActionsIntegration } from '../src/services/github-actions/index'
import { sentryIntegration } from '../src/services/sentry/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('github', () => {
  it('valid + search/create/comment + auth header', async () => {
    expect(() => assertValidIntegration(githubIntegration)).not.toThrow()
    let auth = ''; let ua = ''
    const fetch = fakeFetch((u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      ua = String((init.headers as Record<string, string>)['user-agent'] ?? '')
      if (u.includes('/search/issues')) return json({ items: [{ number: 1, title: 't', html_url: 'u', state: 'open' }] })
      if (u.includes('/comments')) return json({ id: 9, html_url: 'cu' })
      return json({ number: 2, html_url: 'iu' })
    })
    const tools = toToolDefinitions(githubIntegration, { credential: 'gh', fetch })
    const search = tools.find((t) => t.name === 'github_search_issues')!
    expect(await run(search, { q: 'is:open' })).toEqual([{ number: 1, title: 't', url: 'u', state: 'open' }])
    expect(auth).toBe('Bearer gh'); expect(ua).toBe('agentskit-github-tool')
    expect(await run(tools.find((t) => t.name === 'github_create_issue')!, { owner: 'o', repo: 'r', title: 'x' })).toEqual({ number: 2, url: 'iu' })
    expect(await run(tools.find((t) => t.name === 'github_comment_issue')!, { owner: 'o', repo: 'r', number: 1, body: 'b' })).toEqual({ id: 9, url: 'cu' })
  })
})

describe('github-actions', () => {
  it('valid + lists runs with defaultRepo + dispatch + requires repo', async () => {
    expect(() => assertValidIntegration(githubActionsIntegration)).not.toThrow()
    let path = ''
    const fetch = fakeFetch((u) => { path = u; return json({ workflow_runs: [{ id: 1, name: 'ci', head_branch: 'main', status: 'completed', conclusion: 'success', html_url: 'u', created_at: 'd' }] }) })
    const list = toToolDefinitions(githubActionsIntegration, { credential: 'gh', config: { defaultRepo: 'o/r' }, fetch }).find((t) => t.name === 'github_actions_list_runs')!
    const out = (await run(list, {})) as unknown[]
    expect(out).toHaveLength(1); expect(path).toContain('/repos/o/r/actions/runs')
    const noRepo = toToolDefinitions(githubActionsIntegration, { credential: 'gh', config: {}, fetch }).find((t) => t.name === 'github_actions_list_runs')!
    await expect(run(noRepo, {})).rejects.toThrow(/repo .* is required/)
    const disp = toToolDefinitions(githubActionsIntegration, { credential: 'gh', config: { defaultRepo: 'o/r' }, fetch }).find((t) => t.name === 'github_actions_dispatch')!
    expect(await run(disp, { workflowFile: 'ci.yml', ref: 'main' })).toEqual({ ok: true })
  })
})

describe('sentry', () => {
  it('valid + search by org + resolve', async () => {
    expect(() => assertValidIntegration(sentryIntegration)).not.toThrow()
    let path = ''
    const fetch = fakeFetch((u) => { path = u; return json(u.includes('/issues/') && !u.match(/\/issues\/\w/) ? [{ id: '1', shortId: 'S-1', title: 't', status: 'unresolved', level: 'error', permalink: 'p', lastSeen: 'l', count: '3' }] : {}) })
    const search = toToolDefinitions(sentryIntegration, { credential: 'tok', config: { organization: 'acme' }, fetch }).find((t) => t.name === 'sentry_search_issues')!
    const out = (await run(search, { query: 'is:unresolved' })) as Array<{ id: string }>
    expect(out[0].id).toBe('S-1'); expect(path).toContain('/organizations/acme/issues/')
    const resolve = toToolDefinitions(sentryIntegration, { credential: 'tok', config: { organization: 'acme' }, fetch }).find((t) => t.name === 'sentry_resolve_issue')!
    expect(await run(resolve, { issueId: 'S-1' })).toEqual({ ok: true })
  })
})
