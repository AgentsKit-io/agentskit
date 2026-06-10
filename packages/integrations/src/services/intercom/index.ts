import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { intercomActions } from './actions'

export const intercomIntegration = defineIntegration({
  name: 'intercom',
  displayName: 'Intercom',
  categories: ['crm', 'comms'],
  http: { baseUrl: 'https://api.intercom.io' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'INTERCOM_TOKEN' },
  actions: intercomActions,
  capabilities: { send: 'intercom_create_contact' },
})

registerIntegration(intercomIntegration)
