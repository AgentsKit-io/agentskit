import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { sentryActions } from './actions'

export const sentryIntegration = defineIntegration({
  name: 'sentry',
  displayName: 'Sentry',
  categories: ['dev'],
  http: { baseUrl: 'https://sentry.io/api/0' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'SENTRY_AUTH_TOKEN' },
  actions: sentryActions,
})

registerIntegration(sentryIntegration)
