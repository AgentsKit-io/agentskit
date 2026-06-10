import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { asanaActions } from './actions'

export const asanaIntegration = defineIntegration({
  name: 'asana',
  displayName: 'Asana',
  categories: ['productivity'],
  http: { baseUrl: 'https://app.asana.com/api/1.0' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'ASANA_TOKEN' },
  actions: asanaActions,
  capabilities: { send: 'asana_create_task' },
})

registerIntegration(asanaIntegration)
