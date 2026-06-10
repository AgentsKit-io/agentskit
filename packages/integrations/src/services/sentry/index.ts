import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { sentryActions } from './actions'

export const sentryIntegration = defineIntegration({
  name: 'sentry',
  displayName: 'Sentry',
  categories: ['dev'],
  http: { baseUrl: 'https://sentry.io/api/0' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'SENTRY_AUTH_TOKEN' },
  oauth: OAUTH_SPECS.sentry,
  actions: sentryActions,
})

registerIntegration(sentryIntegration)
