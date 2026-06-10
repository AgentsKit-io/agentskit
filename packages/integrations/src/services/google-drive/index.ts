import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { googleDriveActions } from './actions'

export const googleDriveIntegration = defineIntegration({
  name: 'google-drive',
  displayName: 'Google Drive',
  categories: ['storage'],
  http: { baseUrl: 'https://www.googleapis.com/drive/v3' },
  auth: {
    kind: 'oauth2',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    defaultScopes: ['https://www.googleapis.com/auth/drive'],
    usePkce: true,
  },
  oauth: OAUTH_SPECS.google,
  actions: googleDriveActions,
})

registerIntegration(googleDriveIntegration)
