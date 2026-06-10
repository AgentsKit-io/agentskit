import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { slackAuth } from './auth'
import { slackActions } from './actions'
import { slackTriggers } from './triggers'

export const slackIntegration = defineIntegration({
  name: 'slack',
  displayName: 'Slack',
  categories: ['comms'],
  http: { baseUrl: 'https://slack.com/api' },
  auth: slackAuth,
  oauth: OAUTH_SPECS.slack,
  actions: slackActions,
  triggers: slackTriggers,
  capabilities: { send: 'slack_post_message', notify: 'slack_post_message' },
})

registerIntegration(slackIntegration)
