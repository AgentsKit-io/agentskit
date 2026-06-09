import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { boxActions } from './actions'

export const boxIntegration = defineIntegration({
  name: 'box',
  displayName: 'Box',
  categories: ['storage'],
  http: { baseUrl: 'https://api.box.com/2.0' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'BOX_TOKEN' },
  actions: boxActions,
})

registerIntegration(boxIntegration)
