import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { shopifyActions } from './actions'

export const shopifyIntegration = defineIntegration({
  name: 'shopify',
  displayName: 'Shopify',
  categories: ['commerce'],
  // Per-shop Admin API base URL supplied by the caller (projection config).
  auth: { kind: 'apiKey', header: 'x-shopify-access-token', prefix: '', envHint: 'SHOPIFY_ACCESS_TOKEN' },
  actions: shopifyActions,
})

registerIntegration(shopifyIntegration)
