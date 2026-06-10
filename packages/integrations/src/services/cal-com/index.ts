import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { calComActions } from './actions'

export const calComIntegration = defineIntegration({
  name: 'cal-com',
  displayName: 'Cal.com',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.cal.com/v1' },
  // API key is sent as the `apiKey` query param (from ctx.config).
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS['cal-com'],
  actions: calComActions,
})

registerIntegration(calComIntegration)
