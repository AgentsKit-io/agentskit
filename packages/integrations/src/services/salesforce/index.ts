import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { salesforceActions } from './actions'

export const salesforceIntegration = defineIntegration({
  name: 'salesforce',
  displayName: 'Salesforce',
  categories: ['crm'],
  // Per-org instance URL is supplied by the caller (projection config baseUrl);
  // the OAuth2 access token is bound as Bearer.
  auth: {
    kind: 'oauth2',
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    defaultScopes: ['api', 'refresh_token'],
    usePkce: true,
  },
  actions: salesforceActions,
  capabilities: { send: 'salesforce_create_record' },
})

registerIntegration(salesforceIntegration)
