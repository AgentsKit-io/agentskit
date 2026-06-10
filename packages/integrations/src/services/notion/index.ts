import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { notionActions } from './actions'

export const notionIntegration = defineIntegration({
  name: 'notion',
  displayName: 'Notion',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.notion.com/v1', headers: { 'notion-version': '2022-06-28' } },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'NOTION_TOKEN' },
  oauth: OAUTH_SPECS.notion,
  actions: notionActions,
  capabilities: { send: 'notion_create_page' },
})

registerIntegration(notionIntegration)
