import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { readerActions } from './actions'

export const readerIntegration = defineIntegration({
  name: 'reader',
  displayName: 'Jina Reader',
  categories: ['web'],
  // Custom URL form (r.jina.ai/<url>) built per-call via ctx.fetch/ctx.config.
  auth: { kind: 'none' },
  actions: readerActions,
})

registerIntegration(readerIntegration)
