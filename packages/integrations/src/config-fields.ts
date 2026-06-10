import type { ConfigField } from './contract'

/**
 * Declarative connect-form fields for catalog services that authenticate with
 * structured config rather than a single API key. A host renders these as a
 * connect form; the captured values become the `config` object each action
 * reads. Adapter-injected services (email transport, Teams bot client) are not
 * here — they are wired in code, not via a form.
 *
 * Field keys match the `*RuntimeConfig` shapes the service actions read.
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
} as const satisfies Record<string, ConfigField[]>
