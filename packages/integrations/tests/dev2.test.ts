import { describe, it, expect } from 'vitest'
import { linearIntegration } from '../src/services/linear/index'
import { linearTriageIntegration } from '../src/services/linear-triage/index'
import { jiraIntegration } from '../src/services/jira/index'
import { pagerdutyIntegration } from '../src/services/pagerduty/index'
import { linearGql } from '../src/services/linear/gql'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('linear', () => {
  it('valid + raw apiKey header + search/create', async () => {
    expect(() => assertValidIntegration(linearIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((u, init) => {
      auth = String((init.headers as Record<string, string>).authorization)
      const body = JSON.parse(String(init.body))
      if (body.query.includes('issueCreate')) return json({ data: { issueCreate: { success: true, issue: { id: '1', identifier: 'ENG-1', url: 'u' } } } })
      return json({ data: { issueSearch: { nodes: [{ id: '1', identifier: 'ENG-2', title: 't', url: 'u2', state: { name: 'Todo' } }] } } })
    })
    const tools = toToolDefinitions(linearIntegration, { credential: 'lin_key', fetch })
    expect(await run(tools.find((t) => t.name === 'linear_search_issues')!, { query: 'bug' })).toEqual([{ id: 'ENG-2', title: 't', url: 'u2', state: 'Todo' }])
    expect(auth).toBe('lin_key')
    expect(await run(tools.find((t) => t.name === 'linear_create_issue')!, { teamId: 'T', title: 'x' })).toEqual({ id: 'ENG-1', url: 'u' })
  })
  it('surfaces GraphQL errors', async () => {
    const fetch = fakeFetch(() => json({ errors: [{ message: 'boom' }] }))
    const [search] = toToolDefinitions(linearIntegration, { credential: 'k', fetch })
    await expect(run(search, { query: 'x' })).rejects.toThrow(/boom/)
  })
})

describe('linear-triage', () => {
  it('valid + lists triage + assigns', async () => {
    expect(() => assertValidIntegration(linearTriageIntegration)).not.toThrow()
    const fetch = fakeFetch((_u, init) => {
      const body = JSON.parse(String(init.body))
      if (body.query.includes('issueUpdate')) return json({ data: { issueUpdate: { success: true, issue: { identifier: 'E-1', url: 'u' } } } })
      return json({ data: { team: { issues: { nodes: [{ id: '1', identifier: 'E-2', title: 't', url: 'u2', priority: 2 }] } } } })
    })
    const tools = toToolDefinitions(linearTriageIntegration, { credential: 'k', fetch })
    expect(((await run(tools.find((t) => t.name === 'linear_triage_list')!, { teamId: 'T' })) as unknown[]).length).toBe(1)
    expect(await run(tools.find((t) => t.name === 'linear_triage_assign')!, { issueId: 'E-2', stateId: 'S' })).toEqual({ id: 'E-1', url: 'u' })
  })
})

describe('jira', () => {
  it('valid + JQL search + create with browse url from config', async () => {
    expect(() => assertValidIntegration(jiraIntegration)).not.toThrow()
    const fetch = fakeFetch((u) => {
      if (u.includes('/search')) return json({ issues: [{ key: 'ENG-1', fields: { summary: 's', status: { name: 'Open' }, assignee: { displayName: 'Bob' } } }] })
      return json({ key: 'ENG-9', self: 'x' })
    })
    const tools = toToolDefinitions(jiraIntegration, { baseUrl: 'https://acme.atlassian.net', headers: { authorization: 'Basic z' }, config: { baseUrl: 'https://acme.atlassian.net' }, fetch })
    expect(await run(tools.find((t) => t.name === 'jira_search_issues')!, { jql: 'project=ENG' })).toEqual([{ key: 'ENG-1', summary: 's', status: 'Open', assignee: 'Bob' }])
    expect(await run(tools.find((t) => t.name === 'jira_create_issue')!, { projectKey: 'ENG', summary: 's' })).toEqual({ key: 'ENG-9', url: 'https://acme.atlassian.net/browse/ENG-9' })
  })
})

describe('pagerduty', () => {
  const base = { routingKey: 'rk', apiToken: 'tok' }
  it('valid + trigger/ack/resolve + oncall', async () => {
    expect(() => assertValidIntegration(pagerdutyIntegration)).not.toThrow()
    const fetch = fakeFetch((u) => {
      if (u.includes('/schedules/')) return json({ users: [{ id: 'u1', name: 'Ana', email: 'a@x.io' }] })
      return json({ status: 'success', dedup_key: 'dk' })
    })
    const tools = toToolDefinitions(pagerdutyIntegration, { config: base, fetch })
    expect(await run(tools.find((t) => t.name === 'pagerduty_trigger')!, { summary: 's', source: 'h', severity: 'error' })).toEqual({ dedup_key: 'dk' })
    expect(await run(tools.find((t) => t.name === 'pagerduty_resolve')!, { dedup_key: 'dk' })).toEqual({ ok: true })
    expect(await run(tools.find((t) => t.name === 'pagerduty_oncall')!, { schedule_id: 'S1' })).toEqual({ id: 'u1', name: 'Ana', email: 'a@x.io' })
  })
  it('oncall requires apiToken', async () => {
    const fetch = fakeFetch(() => json({}))
    const oncall = toToolDefinitions(pagerdutyIntegration, { config: { routingKey: 'rk' }, fetch }).find((t) => t.name === 'pagerduty_oncall')!
    await expect(run(oncall, { schedule_id: 'S1' })).rejects.toThrow(/apiToken required/)
  })
})

describe('linearGql', () => {
  const http = (resp: unknown) => (async () => resp) as never
  it('returns data on success', async () => {
    const out = await linearGql<{ ok: boolean }>(http({ data: { ok: true } }), 'q', {})
    expect(out).toEqual({ ok: true })
  })
  it('throws on empty response', async () => {
    await expect(linearGql(http({}), 'q', {})).rejects.toThrow(/empty response/)
  })
})
