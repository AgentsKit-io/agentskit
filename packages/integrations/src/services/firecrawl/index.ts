import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { firecrawlActions } from './actions'

export const firecrawlIntegration = defineIntegration({
  name: 'firecrawl',
  displayName: 'Firecrawl',
  categories: ['web'],
  http: { baseUrl: 'https://api.firecrawl.dev/v1' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'FIRECRAWL_API_KEY' },
  actions: firecrawlActions,
})

registerIntegration(firecrawlIntegration)
