import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { templateAuth } from './auth'
import { templateActions } from './actions'
import { templateTriggers } from './triggers'

/**
 * Service descriptor scaffold. Copy this directory to `services/<name>` (or run
 * `pnpm gen:integration <name>`), then replace every `template` token.
 *
 * `name` MUST match the service slug used as the OS ConnectionKind.
 */
export const template = defineIntegration({
  name: 'template',
  displayName: 'Template',
  categories: ['example'],
  http: { baseUrl: 'https://api.example.com' },
  auth: templateAuth,
  actions: templateActions,
  triggers: templateTriggers,
  capabilities: {},
})

// Real services register on load so the catalog picks them up. The scaffold is
// never imported by the catalog index, so this line does not run.
registerIntegration(template)
