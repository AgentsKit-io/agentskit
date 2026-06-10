import { defineAction } from '../../contract'

export const calendlyMe = defineAction({
  name: 'calendly_me',
  description: 'Get the current Calendly user (includes the user URI needed by other calls).',
  sideEffect: 'read',
  schema: { type: 'object', properties: {} },
  async execute(_args, { http }) {
    const result = await http<{ resource: { uri: string; name: string; email: string; scheduling_url: string } }>({
      method: 'GET',
      path: '/users/me',
    })
    return { uri: result.resource.uri, name: result.resource.name, email: result.resource.email, schedulingUrl: result.resource.scheduling_url }
  },
})

export const calendlyListEventTypes = defineAction({
  name: 'calendly_list_event_types',
  description: 'List a Calendly user\'s event types.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { user: { type: 'string', description: 'User URI (from calendly_me).' }, count: { type: 'number' } },
    required: ['user'],
  },
  async execute(args, { http }) {
    const result = await http<{ collection?: Array<{ uri: string; name: string; slug: string; duration: number; active: boolean }> }>({
      method: 'GET',
      path: '/event_types',
      query: { user: String(args.user), count: typeof args.count === 'number' ? args.count : 25 },
    })
    return (result.collection ?? []).map((e) => ({ uri: e.uri, name: e.name, slug: e.slug, duration: e.duration, active: e.active }))
  },
})

export const calendlyActions = [calendlyMe, calendlyListEventTypes]
