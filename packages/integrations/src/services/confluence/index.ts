import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { confluenceActions } from './actions'

export const confluenceIntegration = defineIntegration({
  name: 'confluence',
  displayName: 'Confluence',
  categories: ['productivity'],
  // Per-instance base URL + Basic auth supplied by the caller (projection config).
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.confluence,
  oauth: OAUTH_SPECS.confluence,
  actions: confluenceActions,
  capabilities: { send: 'confluence_create_page' },
})

registerIntegration(confluenceIntegration)
