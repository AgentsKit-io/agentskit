import { defineAction } from '../../contract'

function apiKeyOf(config: unknown): string {
  return (config as { apiKey: string }).apiKey
}

export const calListBookings = defineAction({
  name: 'cal_list_bookings',
  description: 'List Cal.com bookings.',
  sideEffect: 'read',
  schema: { type: 'object', properties: {} },
  async execute(_args, { http, config }) {
    const result = await http<{ bookings?: Array<{ id: number; title: string; startTime: string; status: string }> }>({
      method: 'GET',
      path: '/bookings',
      query: { apiKey: apiKeyOf(config) },
    })
    return (result.bookings ?? []).map((b) => ({ id: b.id, title: b.title, startTime: b.startTime, status: b.status }))
  },
})

export const calListEventTypes = defineAction({
  name: 'cal_list_event_types',
  description: 'List Cal.com event types.',
  sideEffect: 'read',
  schema: { type: 'object', properties: {} },
  async execute(_args, { http, config }) {
    const result = await http<{ event_types?: Array<{ id: number; title: string; slug: string; length: number }> }>({
      method: 'GET',
      path: '/event-types',
      query: { apiKey: apiKeyOf(config) },
    })
    return (result.event_types ?? []).map((e) => ({ id: e.id, title: e.title, slug: e.slug, length: e.length }))
  },
})

export const calComActions = [calListBookings, calListEventTypes]
