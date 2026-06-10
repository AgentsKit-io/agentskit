import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { baserowActions } from './actions'

export const baserowIntegration = defineIntegration({
  name: 'baserow',
  displayName: 'Baserow',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.baserow.io/api' },
  // Baserow database tokens use the `Token <key>` Authorization scheme.
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Token ', envHint: 'BASEROW_TOKEN' },
  actions: baserowActions,
  capabilities: { send: 'baserow_create_row' },
})

registerIntegration(baserowIntegration)
