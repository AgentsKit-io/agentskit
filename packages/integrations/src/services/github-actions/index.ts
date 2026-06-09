import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { githubActionsActions } from './actions'

export const githubActionsIntegration = defineIntegration({
  name: 'github-actions',
  displayName: 'GitHub Actions',
  categories: ['dev'],
  http: {
    baseUrl: 'https://api.github.com',
    headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
  },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'GITHUB_TOKEN' },
  actions: githubActionsActions,
})

registerIntegration(githubActionsIntegration)
