import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { mondayActions } from './actions'

/** Descriptor for the monday.com service integration (GraphQL API v2). */
export const mondayIntegration = defineIntegration({
  name: 'monday',
  displayName: 'monday.com',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.monday.com' },
  auth: { kind: 'apiKey', header: 'authorization', envHint: 'MONDAY_API_TOKEN' },
  oauth: OAUTH_SPECS.monday,
  actions: mondayActions,
})

registerIntegration(mondayIntegration)
