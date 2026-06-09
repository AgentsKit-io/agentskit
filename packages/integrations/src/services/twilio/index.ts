import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { twilioActions } from './actions'

export const twilioIntegration = defineIntegration({
  name: 'twilio',
  displayName: 'Twilio',
  categories: ['comms'],
  http: { baseUrl: 'https://api.twilio.com' },
  // Basic auth (accountSid:authToken) is built per-call from ctx.config.
  auth: { kind: 'none' },
  actions: twilioActions,
  capabilities: { send: 'twilio_send_sms', notify: 'twilio_send_sms' },
})

registerIntegration(twilioIntegration)
