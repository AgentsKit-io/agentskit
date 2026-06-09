import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { confluenceActions } from './actions'

export const confluenceIntegration = defineIntegration({
  name: 'confluence',
  displayName: 'Confluence',
  categories: ['productivity'],
  // Per-instance base URL + Basic auth supplied by the caller (projection config).
  auth: { kind: 'none' },
  actions: confluenceActions,
  capabilities: { send: 'confluence_create_page' },
})

registerIntegration(confluenceIntegration)
