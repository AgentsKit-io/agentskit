import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { teamsActions } from './actions'

export const teamsIntegration = defineIntegration({
  name: 'teams',
  displayName: 'Microsoft Teams',
  categories: ['comms'],
  auth: { kind: 'none' },
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
