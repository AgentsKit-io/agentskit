import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { acuityActions } from './actions'

export const acuityIntegration = defineIntegration({
  name: 'acuity',
  displayName: 'Acuity Scheduling',
  categories: ['productivity'],
  // Basic auth (userId:apiKey) built per-call from ctx.config.
  auth: { kind: 'none' },
  actions: acuityActions,
})

registerIntegration(acuityIntegration)
