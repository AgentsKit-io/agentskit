import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { githubActionsList } from './actions'
import { githubTriggers } from './triggers'

export const githubIntegration = defineIntegration({
  name: 'github',
  displayName: 'GitHub',
  categories: ['dev'],
  http: {
    baseUrl: 'https://api.github.com',
    headers: { 'user-agent': 'agentskit-github-tool', accept: 'application/vnd.github+json' },
  },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'GITHUB_TOKEN' },
  oauth: OAUTH_SPECS.github,
  actions: githubActionsList,
  triggers: githubTriggers,
  capabilities: { send: 'github_comment_issue' },
})

registerIntegration(githubIntegration)
