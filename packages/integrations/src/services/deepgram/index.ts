import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { deepgramActions } from './actions'

export const deepgramIntegration = defineIntegration({
  name: 'deepgram',
  displayName: 'Deepgram',
  categories: ['ai', 'media'],
  http: { baseUrl: 'https://api.deepgram.com/v1' },
  // Token auth header built per-call from ctx.config.
  auth: { kind: 'none' },
  actions: deepgramActions,
})

registerIntegration(deepgramIntegration)
