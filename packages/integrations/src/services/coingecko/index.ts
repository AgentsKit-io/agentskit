import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { coingeckoActions } from './actions'

export const coingeckoIntegration = defineIntegration({
  name: 'coingecko',
  displayName: 'CoinGecko',
  categories: ['web', 'crypto'],
  http: { baseUrl: 'https://api.coingecko.com/api/v3' },
  // Public endpoint needs no auth; an optional pro key is sent via the
  // x-cg-pro-api-key header (added by the caller through projection config).
  auth: { kind: 'none' },
  actions: coingeckoActions,
})

registerIntegration(coingeckoIntegration)
