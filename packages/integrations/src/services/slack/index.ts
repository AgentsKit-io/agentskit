import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { slackAuth } from './auth'
import { slackActions } from './actions'

export const slackIntegration = defineIntegration({
  name: 'slack',
  displayName: 'Slack',
  categories: ['comms'],
  http: { baseUrl: 'https://slack.com/api' },
  auth: slackAuth,
  actions: slackActions,
  capabilities: { send: 'slack_post_message', notify: 'slack_post_message' },
})

registerIntegration(slackIntegration)
