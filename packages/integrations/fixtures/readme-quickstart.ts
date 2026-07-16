// Most consumers don't author integrations directly — they pull ready-made
// service descriptors from the registry and project them into tools:
import { integrationTools } from '@agentskit/integrations'

export const tools = integrationTools('slack', {
  credential: process.env.SLACK_BOT_TOKEN,
})
