import { describe, it, expect, vi } from 'vitest'
import {
  jira, confluence, githubActions, sentry, figma,
  linearTriage, hubspot, airtable, shopify,
} from '../src/integrations/index'

function fakeFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(String(input), init ?? {})
  ) as unknown as typeof fetch
}

describe('jira', () => {
  it('searches via JQL POST', async () => {
    let captured: Record<string, unknown> = {}
    const fetchMock = fakeFetch((_url, init) => {
      captured = JSON.parse(String(init.body))
      return new Response(JSON.stringify({
        issues: [{ key: 'ENG-1', fields: { summary: 't', status: { name: 'Open' } } }],
      }), { status: 200 })
    })
    const tools = jira({ baseUrl: 'https://x.atlassian.net', email: 'a@b', apiToken: 'k', fetch: fetchMock })
    const result = await tools[0].execute({ jql: 'project = ENG' }) as Array<{ key: string }>
    expect(captured.jql).toBe('project = ENG')
    expect(result[0].key).toBe('ENG-1')
  })
})

describe('confluence', () => {
  it('exposes search + createPage', () => {
    const tools = confluence({ baseUrl: 'https://x.atlassian.net', email: 'a@b', apiToken: 'k' })
    expect(tools.map(t => t.name)).toEqual(['confluence_search', 'confluence_create_page'])
  })
})

describe('githubActions', () => {
  it('lists runs and accepts a default repo', async () => {
    const fetchMock = fakeFetch(() => new Response(JSON.stringify({
      workflow_runs: [{
        id: 1, name: 'CI', head_branch: 'main', status: 'completed',
        conclusion: 'success', html_url: 'u', created_at: 'd',
      }],
    })))
    const tools = githubActions({ token: 't', defaultRepo: 'org/repo', fetch: fetchMock })
    const result = await tools[0].execute({}) as Array<{ id: number }>
    expect(result[0].id).toBe(1)
  })

  it('rejects when neither repo nor defaultRepo is set', async () => {
    const tools = githubActions({ token: 't', fetch: fakeFetch(() => new Response('{}')) })
    await expect(tools[0].execute({})).rejects.toThrow(/repo/)
  })
})

describe('sentry', () => {
  it('hits the org issues endpoint by default', async () => {
    let capturedUrl = ''
    const fetchMock = fakeFetch((url) => {
      capturedUrl = url
      return new Response(JSON.stringify([]))
    })
    const tools = sentry({ authToken: 't', organization: 'my-org', fetch: fetchMock })
    await tools[0].execute({})
    expect(capturedUrl).toContain('/organizations/my-org/issues/')
  })

  it('hits the project endpoint when project is set', async () => {
    let capturedUrl = ''
    const fetchMock = fakeFetch((url) => {
      capturedUrl = url
      return new Response(JSON.stringify([]))
    })
    const tools = sentry({ authToken: 't', organization: 'my-org', fetch: fetchMock })
    await tools[0].execute({ project: 'web' })
    expect(capturedUrl).toContain('/projects/my-org/web/issues/')
  })
})

describe('figma', () => {
  it('passes x-figma-token header', async () => {
    let captured: Record<string, string> = {}
    const fetchMock = fakeFetch((_url, init) => {
      captured = init.headers as Record<string, string>
      return new Response(JSON.stringify({ name: 'F', lastModified: 'd', document: { children: [] } }))
    })
    const tools = figma({ accessToken: 'figd_test', fetch: fetchMock })
    await tools[0].execute({ fileKey: 'abc' })
    expect(captured['x-figma-token']).toBe('figd_test')
  })
})

describe('linearTriage', () => {
  it('queries triage state via GraphQL', async () => {
    let captured: Record<string, unknown> = {}
    const fetchMock = fakeFetch((_url, init) => {
      captured = JSON.parse(String(init.body))
      return new Response(JSON.stringify({
        data: { team: { issues: { nodes: [] } } },
      }))
    })
    const tools = linearTriage({ apiKey: 'lin_test', fetch: fetchMock })
    await tools[0].execute({ teamId: 't1' })
    expect(String(captured.query)).toContain('triage')
  })
})

describe('hubspot', () => {
  it('searches contacts and projects useful properties', async () => {
    const fetchMock = fakeFetch(() => new Response(JSON.stringify({
      results: [{ id: '1', properties: { email: 'a@b.com', firstname: 'A', lastname: 'B', company: 'C' } }],
    })))
    const tools = hubspot({ accessToken: 'hb_test', fetch: fetchMock })
    const result = await tools[0].execute({ query: 'a' }) as Array<{ name: string }>
    expect(result[0].name).toBe('A B')
  })
})

describe('airtable', () => {
  it('routes by baseId', async () => {
    let url = ''
    const fetchMock = fakeFetch((u) => { url = u; return new Response(JSON.stringify({ records: [] })) })
    const tools = airtable({ apiKey: 't', baseId: 'appXYZ', fetch: fetchMock })
    await tools[0].execute({ table: 'Tasks' })
    expect(url).toContain('/appXYZ/Tasks')
  })
})

describe('shopify', () => {
  it('builds the admin URL with shop + apiVersion', async () => {
    let url = ''
    const fetchMock = fakeFetch((u) => { url = u; return new Response(JSON.stringify({ orders: [] })) })
    const tools = shopify({ shop: 'my-store.myshopify.com', accessToken: 't', fetch: fetchMock })
    await tools[1].execute({})
    expect(url).toContain('my-store.myshopify.com/admin/api/2024-10/orders.json')
  })
})
