import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { mailchimpActions } from './actions'

export const mailchimpIntegration = defineIntegration({
  name: 'mailchimp',
  displayName: 'Mailchimp',
  categories: ['comms'],
  // Basic auth + per-datacenter base URL are built per-call from ctx.config.
  auth: { kind: 'none' },
  actions: mailchimpActions,
  capabilities: { send: 'mailchimp_add_member' },
})

registerIntegration(mailchimpIntegration)
