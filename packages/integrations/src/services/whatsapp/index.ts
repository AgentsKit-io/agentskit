import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { whatsappActions } from './actions'
import { whatsappTriggers } from './triggers'

export const whatsappIntegration = defineIntegration({
  name: 'whatsapp',
  displayName: 'WhatsApp Cloud API',
  categories: ['comms'],
  http: { baseUrl: 'https://graph.facebook.com/v20.0' },
  // Bearer access token; the phone-number id is carried in ctx.config.
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'WHATSAPP_TOKEN' },
  configFields: CONFIG_FIELDS.whatsapp,
  actions: whatsappActions,
  triggers: whatsappTriggers,
  capabilities: { send: 'whatsapp_send_text', notify: 'whatsapp_send_text' },
})

registerIntegration(whatsappIntegration)
