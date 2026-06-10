import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { bigcommerceActions } from './actions'

export const bigcommerceIntegration = defineIntegration({
  name: 'bigcommerce',
  displayName: 'BigCommerce',
  categories: ['commerce'],
  http: { baseUrl: 'https://api.bigcommerce.com', headers: { accept: 'application/json' } },
  // X-Auth-Token header; store hash is carried in ctx.config (used in the path).
  auth: { kind: 'apiKey', header: 'x-auth-token', prefix: '', envHint: 'BIGCOMMERCE_TOKEN' },
  actions: bigcommerceActions,
})

registerIntegration(bigcommerceIntegration)
