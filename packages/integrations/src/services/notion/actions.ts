import { defineAction } from '../../contract'

export const notionSearch = defineAction({
  name: 'notion_search',
  description: 'Search Notion pages and databases by a query string.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { query: { type: 'string' }, page_size: { type: 'number' } },
    required: ['query'],
  },
  async execute(args, { http }) {
    const result = await http<{ results: Array<{ id: string; url: string; object: string }> }>({
      method: 'POST',
      path: '/search',
      body: { query: args.query, page_size: (args.page_size as number) ?? 10 },
    })
    return result.results.map((r) => ({ id: r.id, url: r.url, type: r.object }))
  },
})

export const notionCreatePage = defineAction({
  name: 'notion_create_page',
  description: 'Create a new Notion page as a child of an existing page.',
  sideEffect: 'external',
  sendCapability: 'pages.create',
  schema: {
    type: 'object',
    properties: { parent_page_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' } },
    required: ['parent_page_id', 'title'],
  },
  async execute(args, { http }) {
    const body = {
      parent: { page_id: args.parent_page_id },
      properties: { title: { title: [{ type: 'text', text: { content: args.title } }] } },
      children: args.content
        ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: args.content } }] } }]
        : undefined,
    }
    const result = await http<{ id: string; url: string }>({ method: 'POST', path: '/pages', body })
    return { id: result.id, url: result.url }
  },
})

export const notionActions = [notionSearch, notionCreatePage]
