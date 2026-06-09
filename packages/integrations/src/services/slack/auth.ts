import type { AuthSpec } from '../../contract'

export const slackAuth: AuthSpec = {
  kind: 'apiKey',
  header: 'authorization',
  prefix: 'Bearer ',
  envHint: 'SLACK_BOT_TOKEN',
}
