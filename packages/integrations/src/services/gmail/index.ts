import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { gmailActions } from './actions'

export const gmailIntegration = defineIntegration({
  name: 'gmail',
  displayName: 'Gmail',
  categories: ['comms', 'productivity'],
  http: { baseUrl: 'https://gmail.googleapis.com/gmail/v1' },
  auth: {
    kind: 'oauth2',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    defaultScopes: ['https://www.googleapis.com/auth/gmail.modify'],
    usePkce: true,
  },
  oauth: OAUTH_SPECS.google,
  actions: gmailActions,
  capabilities: { send: 'gmail_send_email', notify: 'gmail_send_email' },
})

registerIntegration(gmailIntegration)
