import { defineAction } from '../../contract'

function tokenOf(config: unknown): string {
  return (config as { apiToken: string }).apiToken
}

export const pipedriveCreateDeal = defineAction({
  name: 'pipedrive_create_deal',
  description: 'Create a Pipedrive deal.',
  sideEffect: 'external',
  sendCapability: 'deals.create',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      value: { type: 'number' },
      currency: { type: 'string' },
    },
    required: ['title'],
  },
  async execute(args, { http, config }) {
    const result = await http<{ data?: { id: number; title: string } }>({
      method: 'POST',
      path: '/deals',
      query: { api_token: tokenOf(config) },
      body: { title: args.title, value: args.value, currency: args.currency },
    })
    return { id: result.data?.id, title: result.data?.title }
  },
})

export const pipedriveSearchPersons = defineAction({
  name: 'pipedrive_search_persons',
  description: 'Search Pipedrive persons by term.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { term: { type: 'string' }, limit: { type: 'number' } },
    required: ['term'],
  },
  async execute(args, { http, config }) {
    const result = await http<{ data?: { items?: Array<{ item: { id: number; name: string; primary_email?: string } }> } }>({
      method: 'GET',
      path: '/persons/search',
      query: { term: String(args.term), limit: typeof args.limit === 'number' ? args.limit : 10, api_token: tokenOf(config) },
    })
    return (result.data?.items ?? []).map((i) => ({ id: i.item.id, name: i.item.name, email: i.item.primary_email }))
  },
})

export const pipedriveActions = [pipedriveCreateDeal, pipedriveSearchPersons]
