import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { telegramActions } from './actions'
import { telegramTriggers } from './triggers'

export const telegramIntegration = defineIntegration({
  name: 'telegram',
  displayName: 'Telegram',
  categories: ['comms'],
  http: { baseUrl: 'https://api.telegram.org' },
  // Bot token is part of the URL path (/bot<token>/<method>), read from ctx.config.
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.telegram,
  actions: telegramActions,
  triggers: telegramTriggers,
  capabilities: { send: 'telegram_send_message', notify: 'telegram_send_message' },
})

registerIntegration(telegramIntegration)
