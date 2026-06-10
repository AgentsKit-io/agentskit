import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { calComActions } from './actions'

export const calComIntegration = defineIntegration({
  name: 'cal-com',
  displayName: 'Cal.com',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.cal.com/v1' },
  // API key is sent as the `apiKey` query param (from ctx.config).
  auth: { kind: 'none' },
  actions: calComActions,
})

registerIntegration(calComIntegration)
