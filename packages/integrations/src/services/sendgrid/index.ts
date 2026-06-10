import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { sendgridActions } from './actions'

export const sendgridIntegration = defineIntegration({
  name: 'sendgrid',
  displayName: 'SendGrid',
  categories: ['comms'],
  http: { baseUrl: 'https://api.sendgrid.com/v3' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'SENDGRID_API_KEY' },
  actions: sendgridActions,
  capabilities: { send: 'sendgrid_send_email', notify: 'sendgrid_send_email' },
})

registerIntegration(sendgridIntegration)
