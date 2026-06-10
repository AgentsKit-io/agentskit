import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { dropboxActions } from './actions'

export const dropboxIntegration = defineIntegration({
  name: 'dropbox',
  displayName: 'Dropbox',
  categories: ['storage'],
  http: { baseUrl: 'https://api.dropboxapi.com/2' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'DROPBOX_TOKEN' },
  actions: dropboxActions,
})

registerIntegration(dropboxIntegration)
