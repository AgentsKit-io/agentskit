import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { apolloActions } from './actions'

export const apolloIntegration = defineIntegration({
  name: 'apollo',
  displayName: 'Apollo.io',
  categories: ['crm'],
  http: { baseUrl: 'https://api.apollo.io/v1' },
  // Apollo sends the key in the X-Api-Key header.
  auth: { kind: 'apiKey', header: 'x-api-key', prefix: '', envHint: 'APOLLO_API_KEY' },
  actions: apolloActions,
})

registerIntegration(apolloIntegration)
