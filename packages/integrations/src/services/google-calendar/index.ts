import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { googleCalendarActions } from './actions'

export const googleCalendarIntegration = defineIntegration({
  name: 'google-calendar',
  displayName: 'Google Calendar',
  categories: ['productivity'],
  http: { baseUrl: 'https://www.googleapis.com/calendar/v3' },
  auth: {
    kind: 'oauth2',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    defaultScopes: ['https://www.googleapis.com/auth/calendar'],
    usePkce: true,
  },
  actions: googleCalendarActions,
  capabilities: { send: 'calendar_create_event' },
})

registerIntegration(googleCalendarIntegration)
