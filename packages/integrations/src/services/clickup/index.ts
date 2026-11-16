import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { clickupActions } from './actions'

/** Descriptor for the ClickUp service integration (read-only personal API token). */
export const clickupIntegration = defineIntegration({
  name: 'clickup',
  displayName: 'ClickUp',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.clickup.com' },
  auth: { kind: 'apiKey', header: 'authorization', envHint: 'CLICKUP_TOKEN' },
  actions: clickupActions,
  capabilities: {},
})

registerIntegration(clickupIntegration)
