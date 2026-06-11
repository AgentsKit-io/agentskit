import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { teamsActions } from './actions'

export const teamsIntegration = defineIntegration({
  name: 'teams',
  displayName: 'Microsoft Teams',
  categories: ['comms'],
  auth: { kind: 'none' },
  // Flat `webhookUrl`; the host nests it as `{ webhook: { webhookUrl } }`.
  configFields: CONFIG_FIELDS.teams,
  actions: teamsActions,
  capabilities: { send: 'teams_send_webhook', notify: 'teams_send_webhook' },
})

registerIntegration(teamsIntegration)

export {
  adaptiveCard,
  messageCard,
} from './cards'
export type {
  TeamsAdaptiveCardAction,
  TeamsAdaptiveCard,
  TeamsMessageCard,
  TeamsBotMessage,
  TeamsBotSendResult,
  TeamsBotClient,
  TeamsRuntimeConfig,
} from './cards'
