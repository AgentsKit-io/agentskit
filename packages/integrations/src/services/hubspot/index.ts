import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { hubspotActions } from './actions'

export const hubspotIntegration = defineIntegration({
  name: 'hubspot',
  displayName: 'HubSpot',
  categories: ['crm', 'commerce'],
  http: { baseUrl: 'https://api.hubapi.com' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'HUBSPOT_ACCESS_TOKEN' },
  actions: hubspotActions,
  capabilities: { send: 'hubspot_create_deal' },
})

registerIntegration(hubspotIntegration)
