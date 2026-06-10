import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { dropboxActions } from './actions'

export const dropboxIntegration = defineIntegration({
  name: 'dropbox',
  displayName: 'Dropbox',
  categories: ['storage'],
  http: { baseUrl: 'https://api.dropboxapi.com/2' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'DROPBOX_TOKEN' },
  oauth: OAUTH_SPECS.dropbox,
  actions: dropboxActions,
})

registerIntegration(dropboxIntegration)
