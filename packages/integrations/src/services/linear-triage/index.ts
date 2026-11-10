import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { linearTriageActions } from './actions'

/** Descriptor for the Linear Triage service integration. */
export const linearTriageIntegration = defineIntegration({
  name: 'linear-triage',
  displayName: 'Linear Triage',
  categories: ['dev'],
  http: { baseUrl: 'https://api.linear.app/graphql' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: '', envHint: 'LINEAR_API_KEY' },
  actions: linearTriageActions,
})

registerIntegration(linearTriageIntegration)
