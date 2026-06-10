import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { whatsappActions } from './actions'

export const whatsappIntegration = defineIntegration({
  name: 'whatsapp',
  displayName: 'WhatsApp Cloud API',
  categories: ['comms'],
  http: { baseUrl: 'https://graph.facebook.com/v20.0' },
  // Bearer access token; the phone-number id is carried in ctx.config.
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'WHATSAPP_TOKEN' },
  actions: whatsappActions,
  capabilities: { send: 'whatsapp_send_text', notify: 'whatsapp_send_text' },
})

registerIntegration(whatsappIntegration)
