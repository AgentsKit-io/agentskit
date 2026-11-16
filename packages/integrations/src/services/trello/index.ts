import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { trelloActions } from './actions'

/**
 * Descriptor for the Trello service integration. Read-only (least privilege:
 * the token only needs `read` scope). The credential is the Trello header
 * value `oauth_consumer_key="<key>", oauth_token="<token>"`.
 */
export const trelloIntegration = defineIntegration({
  name: 'trello',
  displayName: 'Trello',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.trello.com' },
  auth: {
    kind: 'apiKey',
    header: 'authorization',
    prefix: 'OAuth ',
    envHint: 'TRELLO_CREDENTIAL',
  },
  actions: trelloActions,
  capabilities: {},
})

registerIntegration(trelloIntegration)
