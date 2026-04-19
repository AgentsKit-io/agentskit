import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface NotionConfig extends HttpToolOptions {
  token: string
  /** Notion API version — pinned for predictable schema. Default 2022-06-28. */
  version?: string
}

function opts(config: NotionConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.notion.com/v1',
    headers: {
      authorization: `Bearer ${config.token}`,
      'notion-version': config.version ?? '2022-06-28',
      ...config.headers,
    },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function notionSearch(config: NotionConfig) {
  const base = opts(config)
  return defineTool({
    name: 'notion_search',
    description: 'Search Notion pages and databases by a query string.',
    schema: {
      type: 'object',
      properties: { query: { type: 'string' }, page_size: { type: 'number' } },
      required: ['query'],
    } as const,
    async execute({ query, page_size }) {
      const result = await httpJson<{ results: Array<{ id: string; url: string; object: string }> }>(base, {
        method: 'POST',
        path: '/search',
        body: { query, page_size: page_size ?? 10 },
      })
      return result.results.map(r => ({ id: r.id, url: r.url, type: r.object }))
    },
  })
}

export function notionCreatePage(config: NotionConfig) {
  const base = opts(config)
  return defineTool({
    name: 'notion_create_page',
    description: 'Create a new Notion page as a child of an existing page.',
    schema: {
      type: 'object',
      properties: {
        parent_page_id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['parent_page_id', 'title'],
    } as const,
    async execute({ parent_page_id, title, content }) {
      const body = {
        parent: { page_id: parent_page_id },
        properties: {
          title: { title: [{ type: 'text', text: { content: title } }] },
        },
        children: content
          ? [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content } }] },
              },
            ]
          : undefined,
      }
      const result = await httpJson<{ id: string; url: string }>(base, {
        method: 'POST',
        path: '/pages',
        body,
      })
      return { id: result.id, url: result.url }
    },
  })
}

export function notion(config: NotionConfig) {
  return [notionSearch(config), notionCreatePage(config)]
}
