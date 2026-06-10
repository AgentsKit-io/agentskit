import { defineAction } from '../../contract'

export const apolloSearchPeople = defineAction({
  name: 'apollo_search_people',
  description: 'Search people in Apollo.io by keywords / title / organization.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      q_keywords: { type: 'string' },
      person_titles: { type: 'array', items: { type: 'string' } },
      page: { type: 'number' },
    },
  },
  async execute(args, { http }) {
    const result = await http<{ people?: Array<{ id: string; name: string; title?: string; email?: string }> }>({
      method: 'POST',
      path: '/mixed_people/search',
      body: {
        q_keywords: args.q_keywords,
        person_titles: Array.isArray(args.person_titles) ? args.person_titles : undefined,
        page: typeof args.page === 'number' ? args.page : 1,
      },
    })
    return (result.people ?? []).map((p) => ({ id: p.id, name: p.name, title: p.title, email: p.email }))
  },
})

export const apolloActions = [apolloSearchPeople]
