import type { ToolDefinition } from '@agentskit/core'
import { googleCalendarIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/google-calendar). */
export interface GoogleCalendarConfig extends HttpToolOptions {
  accessToken: string
  /** Default calendar id. Defaults to 'primary'. */
  calendarId?: string
}

function cfg(config: GoogleCalendarConfig): ProjectionConfig {
  return {
    credential: config.accessToken,
    config: { calendarId: config.calendarId },
    baseUrl: config.baseUrl,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function calendarListEvents(config: GoogleCalendarConfig): ToolDefinition {
  return toToolDefinitions(googleCalendarIntegration, cfg(config)).find((t) => t.name === 'calendar_list_events')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function calendarCreateEvent(config: GoogleCalendarConfig): ToolDefinition {
  return toToolDefinitions(googleCalendarIntegration, cfg(config)).find((t) => t.name === 'calendar_create_event')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function googleCalendar(config: GoogleCalendarConfig): ToolDefinition[] {
  return toToolDefinitions(googleCalendarIntegration, cfg(config))
}
