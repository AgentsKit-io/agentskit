import { defineAction } from '../../contract'

function calId(config: unknown): string {
  return (config as { calendarId?: string } | undefined)?.calendarId ?? 'primary'
}

export const calendarListEvents = defineAction({
  name: 'calendar_list_events',
  description: 'List upcoming Google Calendar events.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      time_min: { type: 'string', description: 'RFC3339 timestamp — earliest event start.' },
      time_max: { type: 'string' },
      max_results: { type: 'number' },
    },
  },
  async execute(args, { http, config }) {
    const result = await http<{ items?: Array<{ id: string; summary: string; start?: { dateTime?: string; date?: string }; htmlLink?: string }> }>({
      path: `/calendars/${encodeURIComponent(calId(config))}/events`,
      query: {
        timeMin: args.time_min ? String(args.time_min) : new Date().toISOString(),
        timeMax: args.time_max ? String(args.time_max) : undefined,
        maxResults: (args.max_results as number) ?? 10,
        singleEvents: 'true',
        orderBy: 'startTime',
      },
    })
    return (result.items ?? []).map((e) => ({ id: e.id, summary: e.summary, start: e.start?.dateTime ?? e.start?.date, url: e.htmlLink }))
  },
})

export const calendarCreateEvent = defineAction({
  name: 'calendar_create_event',
  description: 'Create a Google Calendar event.',
  sideEffect: 'external',
  sendCapability: 'events.insert',
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      start: { type: 'string', description: 'RFC3339 start time' },
      end: { type: 'string', description: 'RFC3339 end time' },
      description: { type: 'string' },
      attendees: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'start', 'end'],
  },
  async execute(args, { http, config }) {
    const result = await http<{ id: string; htmlLink: string }>({
      method: 'POST',
      path: `/calendars/${encodeURIComponent(calId(config))}/events`,
      body: {
        summary: args.summary,
        description: args.description,
        start: { dateTime: args.start },
        end: { dateTime: args.end },
        attendees: (args.attendees as string[] | undefined)?.map((email) => ({ email })),
      },
    })
    return { id: result.id, url: result.htmlLink }
  },
})

export const googleCalendarActions = [calendarListEvents, calendarCreateEvent]
