import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { gitlabActions } from './actions'

/** Descriptor for the GitLab service integration (REST API v4, gitlab.com). */
export const gitlabIntegration = defineIntegration({
  name: 'gitlab',
  displayName: 'GitLab',
  categories: ['dev'],
  http: { baseUrl: 'https://gitlab.com' },
  auth: { kind: 'apiKey', header: 'private-token', envHint: 'GITLAB_TOKEN' },
  oauth: OAUTH_SPECS.gitlab,
  actions: gitlabActions,
})

registerIntegration(gitlabIntegration)
