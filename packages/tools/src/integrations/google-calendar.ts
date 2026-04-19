import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface GoogleCalendarConfig extends HttpToolOptions {
  accessToken: string
  /** Default calendar id. Defaults to 'primary'. */
  calendarId?: string
}

function opts(config: GoogleCalendarConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://www.googleapis.com/calendar/v3',
    headers: { authorization: `Bearer ${config.accessToken}`, ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function calendarListEvents(config: GoogleCalendarConfig) {
  const base = opts(config)
  const calId = config.calendarId ?? 'primary'
  return defineTool({
    name: 'calendar_list_events',
    description: 'List upcoming Google Calendar events.',
    schema: {
      type: 'object',
      properties: {
        time_min: { type: 'string', description: 'RFC3339 timestamp — earliest event start.' },
        time_max: { type: 'string' },
        max_results: { type: 'number' },
      },
    } as const,
    async execute({ time_min, time_max, max_results }) {
      const result = await httpJson<{ items?: Array<{ id: string; summary: string; start?: { dateTime?: string; date?: string }; htmlLink?: string }> }>(
        base,
        {
          path: `/calendars/${encodeURIComponent(calId)}/events`,
          query: {
            timeMin: time_min ? String(time_min) : new Date().toISOString(),
            timeMax: time_max ? String(time_max) : undefined,
            maxResults: max_results ?? 10,
            singleEvents: 'true',
            orderBy: 'startTime',
          },
        },
      )
      return (result.items ?? []).map(e => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime ?? e.start?.date,
        url: e.htmlLink,
      }))
    },
  })
}

export function calendarCreateEvent(config: GoogleCalendarConfig) {
  const base = opts(config)
  const calId = config.calendarId ?? 'primary'
  return defineTool({
    name: 'calendar_create_event',
    description: 'Create a Google Calendar event.',
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
    } as const,
    async execute({ summary, start, end, description, attendees }) {
      const result = await httpJson<{ id: string; htmlLink: string }>(base, {
        method: 'POST',
        path: `/calendars/${encodeURIComponent(calId)}/events`,
        body: {
          summary,
          description,
          start: { dateTime: start },
          end: { dateTime: end },
          attendees: (attendees as string[] | undefined)?.map(email => ({ email })),
        },
      })
      return { id: result.id, url: result.htmlLink }
    },
  })
}

export function googleCalendar(config: GoogleCalendarConfig) {
  return [calendarListEvents(config), calendarCreateEvent(config)]
}
