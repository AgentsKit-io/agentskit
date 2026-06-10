import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { acuityActions } from './actions'

export const acuityIntegration = defineIntegration({
  name: 'acuity',
  displayName: 'Acuity Scheduling',
  categories: ['productivity'],
  // Basic auth (userId:apiKey) built per-call from ctx.config.
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.acuity,
  actions: acuityActions,
})

registerIntegration(acuityIntegration)
