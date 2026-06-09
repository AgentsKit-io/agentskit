import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { jiraActions } from './actions'

export const jiraIntegration = defineIntegration({
  name: 'jira',
  displayName: 'Jira',
  categories: ['dev', 'productivity'],
  // Per-instance base URL + Basic auth (email:apiToken) are supplied by the
  // caller (projection config), since the Atlassian site root is tenant-specific.
  auth: { kind: 'none' },
  actions: jiraActions,
  capabilities: { send: 'jira_create_issue' },
})

registerIntegration(jiraIntegration)
