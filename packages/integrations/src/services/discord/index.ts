import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { discordActions } from './actions'
import { discordTriggers } from './triggers'

export const discordIntegration = defineIntegration({
  name: 'discord',
  displayName: 'Discord',
  categories: ['comms'],
  http: { baseUrl: 'https://discord.com/api/v10' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bot ', envHint: 'DISCORD_BOT_TOKEN' },
  oauth: OAUTH_SPECS.discord,
  actions: discordActions,
  triggers: discordTriggers,
  capabilities: { send: 'discord_post_message', notify: 'discord_post_message' },
})

registerIntegration(discordIntegration)
