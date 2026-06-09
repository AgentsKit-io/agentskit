import { defineAction } from '../../contract'

interface ConfluenceRuntimeConfig {
  baseUrl: string
}

export const confluenceSearch = defineAction({
  name: 'confluence_search',
  description: 'Search Confluence pages with CQL.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      cql: { type: 'string', description: 'CQL query, e.g. type=page AND text ~ "agentskit"' },
      limit: { type: 'number' },
    },
    required: ['cql'],
  },
  async execute(args, { http, config }) {
    const baseUrl = (config as ConfluenceRuntimeConfig).baseUrl
    const result = await http<{ results?: Array<{ id: string; title: string; _links?: { webui?: string } }> }>({
      method: 'GET',
      path: '/wiki/rest/api/content/search',
      query: { cql: String(args.cql), limit: (args.limit as number) ?? 25 },
    })
    return (result.results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      url: r._links?.webui ? `${baseUrl}/wiki${r._links.webui}` : undefined,
    }))
  },
})

export const confluenceCreatePage = defineAction({
  name: 'confluence_create_page',
  description: 'Create a Confluence page in a space.',
  sideEffect: 'external',
  sendCapability: 'pages.create',
  schema: {
    type: 'object',
    properties: {
      spaceKey: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string', description: 'HTML body (Confluence storage format).' },
    },
    required: ['spaceKey', 'title', 'body'],
  },
  async execute(args, { http, config }) {
    const baseUrl = (config as ConfluenceRuntimeConfig).baseUrl
    const result = await http<{ id: string; _links?: { webui?: string } }>({
      method: 'POST',
      path: '/wiki/api/v2/pages',
      body: { spaceId: args.spaceKey, status: 'current', title: args.title, body: { representation: 'storage', value: args.body } },
    })
    return { id: result.id, url: result._links?.webui ? `${baseUrl}/wiki${result._links.webui}` : undefined }
  },
})

export const confluenceActions = [confluenceSearch, confluenceCreatePage]
