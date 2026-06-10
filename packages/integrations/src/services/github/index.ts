import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
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
  actions: githubActionsList,
  triggers: githubTriggers,
  capabilities: { send: 'github_comment_issue' },
})

registerIntegration(githubIntegration)
