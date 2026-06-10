---
'@agentskit/integrations': minor
---

Declare connect-form fields for structured-config connectors.

Adds `ConfigField` to the contract and an optional `Integration.configFields`, plus
a central `CONFIG_FIELDS` map wired onto the descriptors of the 13 services that
authenticate with structured config rather than a single API key (Twilio, Jira,
Confluence, Stripe, Telegram, ElevenLabs, Deepgram, Whisper, Cal.com, Acuity,
Mailchimp, PagerDuty, Pipedrive). Each field carries `key` / `label` / `secret?` /
`required?` / `placeholder?`, keyed to the `config` object the actions read — so a
host can render a connect form, validate, and store the values. Adapter-injected
services (email transport, Teams bot client) are intentionally excluded.
