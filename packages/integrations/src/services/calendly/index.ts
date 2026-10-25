import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { calendlyActions } from './actions'

/** Descriptor for the Calendly service integration. */
export const calendlyIntegration = defineIntegration({
  name: 'calendly',
  displayName: 'Calendly',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.calendly.com' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'CALENDLY_TOKEN' },
  actions: calendlyActions,
})

registerIntegration(calendlyIntegration)
