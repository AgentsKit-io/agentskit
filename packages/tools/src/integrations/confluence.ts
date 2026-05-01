import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface ConfluenceConfig extends HttpToolOptions {
  /** Atlassian site root, e.g. `https://my-org.atlassian.net`. */
  baseUrl: string
  email: string
  apiToken: string
}

function opts(config: ConfluenceConfig): HttpToolOptions {
  const auth = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`
  return {
    baseUrl: config.baseUrl,
    headers: { authorization: auth },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function confluenceSearch(config: ConfluenceConfig) {
  return defineTool({
    name: 'confluence_search',
    description: 'Search Confluence pages with CQL.',
    schema: {
      type: 'object',
      properties: {
        cql: { type: 'string', description: 'CQL query, e.g. type=page AND text ~ "agentskit"' },
        limit: { type: 'number' },
      },
      required: ['cql'],
    } as const,
    async execute({ cql, limit }) {
      const result = await httpJson<{
        results?: Array<{ id: string; title: string; _links?: { webui?: string } }>
      }>(opts(config), {
        method: 'GET',
        path: '/wiki/rest/api/content/search',
        query: { cql: String(cql), limit: limit ?? 25 },
      })
      return (result.results ?? []).map(r => ({
        id: r.id,
        title: r.title,
        url: r._links?.webui ? `${config.baseUrl}/wiki${r._links.webui}` : undefined,
      }))
    },
  })
}

export function confluenceCreatePage(config: ConfluenceConfig) {
  return defineTool({
    name: 'confluence_create_page',
    description: 'Create a Confluence page in a space.',
    schema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string', description: 'HTML body (Confluence storage format).' },
      },
      required: ['spaceKey', 'title', 'body'],
    } as const,
    async execute({ spaceKey, title, body }) {
      const result = await httpJson<{ id: string; _links?: { webui?: string } }>(opts(config), {
        method: 'POST',
        path: '/wiki/api/v2/pages',
        body: {
          spaceId: spaceKey,
          status: 'current',
          title,
          body: { representation: 'storage', value: body },
        },
      })
      return {
        id: result.id,
        url: result._links?.webui ? `${config.baseUrl}/wiki${result._links.webui}` : undefined,
      }
    },
  })
}

export function confluence(config: ConfluenceConfig): ToolDefinition[] {
  return [
    confluenceSearch(config) as unknown as ToolDefinition,
    confluenceCreatePage(config) as unknown as ToolDefinition,
  ]
}
