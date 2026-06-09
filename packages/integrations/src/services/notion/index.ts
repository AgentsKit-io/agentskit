import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { notionActions } from './actions'

export const notionIntegration = defineIntegration({
  name: 'notion',
  displayName: 'Notion',
  categories: ['productivity'],
  http: { baseUrl: 'https://api.notion.com/v1', headers: { 'notion-version': '2022-06-28' } },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'NOTION_TOKEN' },
  actions: notionActions,
  capabilities: { send: 'notion_create_page' },
})

registerIntegration(notionIntegration)
