import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { attioActions } from './actions'

export const attioIntegration = defineIntegration({
  name: 'attio',
  displayName: 'Attio',
  categories: ['crm'],
  http: { baseUrl: 'https://api.attio.com/v2' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'ATTIO_API_KEY' },
  actions: attioActions,
  capabilities: { send: 'attio_create_record' },
})

registerIntegration(attioIntegration)
