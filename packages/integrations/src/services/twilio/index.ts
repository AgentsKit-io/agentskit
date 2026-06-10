import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { twilioActions } from './actions'
import { twilioTriggers } from './triggers'

export const twilioIntegration = defineIntegration({
  name: 'twilio',
  displayName: 'Twilio',
  categories: ['comms'],
  http: { baseUrl: 'https://api.twilio.com' },
  // Basic auth (accountSid:authToken) is built per-call from ctx.config.
  auth: { kind: 'none' },
  actions: twilioActions,
  triggers: twilioTriggers,
  capabilities: { send: 'twilio_send_sms', notify: 'twilio_send_sms' },
})

registerIntegration(twilioIntegration)
