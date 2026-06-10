import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { linearActions } from './actions'
import { linearTriggers } from './triggers'

export const linearIntegration = defineIntegration({
  name: 'linear',
  displayName: 'Linear',
  categories: ['dev'],
  http: { baseUrl: 'https://api.linear.app/graphql' },
  // Linear personal API keys go in the Authorization header verbatim (no Bearer).
  auth: { kind: 'apiKey', header: 'authorization', prefix: '', envHint: 'LINEAR_API_KEY' },
  oauth: OAUTH_SPECS.linear,
  actions: linearActions,
  triggers: linearTriggers,
  capabilities: { send: 'linear_create_issue' },
})

registerIntegration(linearIntegration)
