import type { ConfigField } from './contract'

/**
 * Declarative connect-form fields for catalog services that authenticate with
 * structured config rather than a single API key. A host renders these as a
 * connect form; the captured values become the `config` object each action
 * reads. The Teams *bot* client stays adapter-injected (code, not a form); the
 * Teams *webhook* and the email SMTP transport, however, are built by the host
 * from these flat form fields — see the `email` / `teams` entries below.
 *
 * Field keys match the `*RuntimeConfig` shapes the service actions read, EXCEPT
 * `email` and `teams`, whose flat fields the host adapter maps onto the nested
 * runtime shape (`{ webhook: { webhookUrl } }`) / an `EmailTransport` it
 * constructs (e.g. via nodemailer) before invoking the action.
 */
export const CONFIG_FIELDS = {
  twilio: [
    { key: 'accountSid', label: 'Account SID', secret: true, required: true, placeholder: 'AC…' },
    { key: 'authToken', label: 'Auth Token', secret: true, required: true },
    { key: 'fromNumber', label: 'From number (E.164)', required: true, placeholder: '+15551234567' },
  ],
  jira: [
    { key: 'baseUrl', label: 'Base URL', required: true, placeholder: 'https://your-org.atlassian.net' },
  ],
  confluence: [
    { key: 'baseUrl', label: 'Base URL', required: true, placeholder: 'https://your-org.atlassian.net/wiki' },
  ],
  stripe: [{ key: 'apiKey', label: 'Secret key', secret: true, required: true, placeholder: 'sk_live_…' }],
  telegram: [{ key: 'token', label: 'Bot token', secret: true, required: true }],
  elevenlabs: [{ key: 'apiKey', label: 'API key', secret: true, required: true }],
  deepgram: [{ key: 'apiKey', label: 'API key', secret: true, required: true }],
  whisper: [{ key: 'apiKey', label: 'API key', secret: true, required: true }],
  'cal-com': [{ key: 'apiKey', label: 'API key', secret: true, required: true }],
  acuity: [
    { key: 'userId', label: 'User ID', required: true },
    { key: 'apiKey', label: 'API key', secret: true, required: true },
  ],
  mailchimp: [
    { key: 'apiKey', label: 'API key', secret: true, required: true },
    { key: 'dc', label: 'Datacenter', required: true, placeholder: 'us21' },
  ],
  pagerduty: [
    { key: 'routingKey', label: 'Routing key', secret: true, required: true },
    { key: 'apiToken', label: 'REST API token', secret: true, required: false },
  ],
  pipedrive: [{ key: 'apiToken', label: 'API token', secret: true, required: true }],
  // Flat SMTP fields; the host builds an `EmailTransport` from them (the
  // `email_send` action reads `config.transport`, not these keys directly).
  email: [
    { key: 'host', label: 'SMTP host', required: true, placeholder: 'smtp.example.com' },
    { key: 'port', label: 'SMTP port', required: true, placeholder: '587' },
    { key: 'user', label: 'Username', required: true },
    { key: 'pass', label: 'Password', secret: true, required: true },
    { key: 'secure', label: 'Use TLS (true/false)', required: false, placeholder: 'false' },
    { key: 'from', label: 'Default from address', required: false, placeholder: 'bot@example.com' },
  ],
  // Flat webhook URL; the host nests it as `{ webhook: { webhookUrl } }` (the
  // shape `teams_send_webhook` reads from `config.webhook`).
  teams: [
    {
      key: 'webhookUrl',
      label: 'Incoming webhook URL',
      secret: true,
      required: true,
      placeholder: 'https://outlook.office.com/webhook/…',
    },
  ],
} as const satisfies Record<string, ConfigField[]>
