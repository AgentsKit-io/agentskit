// Service barrel — re-exports + side-effect registration of each descriptor.
// `pnpm gen:integration <name>` appends a line here.
export { slackIntegration } from './slack'
export { discordIntegration } from './discord'
export { gmailIntegration } from './gmail'
export { twilioIntegration } from './twilio'
export * from './email'
export * from './teams'
