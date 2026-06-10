import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { telegramActions } from './actions'

export const telegramIntegration = defineIntegration({
  name: 'telegram',
  displayName: 'Telegram',
  categories: ['comms'],
  http: { baseUrl: 'https://api.telegram.org' },
  // Bot token is part of the URL path (/bot<token>/<method>), read from ctx.config.
  auth: { kind: 'none' },
  actions: telegramActions,
  capabilities: { send: 'telegram_send_message', notify: 'telegram_send_message' },
})

registerIntegration(telegramIntegration)
