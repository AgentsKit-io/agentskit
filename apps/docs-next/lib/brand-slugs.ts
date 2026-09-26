/**
 * Map an AgentsKit integration/provider id to a Simple Icons slug (logos are
 * self-hosted, see lib/brand-logos.json). Most ids map 1:1; overrides cover the
 * rest. Ids without a known brand icon fall back to a text chip at render time.
 */
const OVERRIDES: Record<string, string> = {
  'google-calendar': 'googlecalendar',
  'openai-images': 'openai',
  'github-actions': 'githubactions',
  'cloudflare-r2': 'cloudflare',
  gmail: 'gmail',
  maps: 'googlemaps',
  reader: 'readme',
  // providers (models.dev ids → brand slugs)
  gemini: 'googlegemini',
  google: 'google',
  'google-vertex': 'googlecloud',
  'google-vertex-anthropic': 'anthropic',
  'amazon-bedrock': 'amazonaws',
  azure: 'microsoftazure',
  'azure-cognitive-services': 'microsoftazure',
  vertex: 'googlecloud',
  xai: 'x',
  grok: 'x',
  deepseek: 'deepseek',
  togetherai: 'together',
  huggingface: 'huggingface',
  'kimi-for-coding': 'moonshot',
  kimi: 'moonshot',
  alibaba: 'alibabacloud',
  'alibaba-cn': 'alibabacloud',
  mistral: 'mistralai',
  'cloudflare-workers-ai': 'cloudflare',
  'cloudflare-ai-gateway': 'cloudflare',
  'cal-com': 'caldotcom',
  perplexity: 'perplexity',
  fireworks: 'fireworks',
  vercel: 'vercel',
  openrouter: 'openrouter',
}

/** Simple Icons slug for an id, or null if there is clearly no brand match. */
export function brandSlug(id: string): string {
  if (OVERRIDES[id]) return OVERRIDES[id]
  // default: strip non-alphanumerics (Simple Icons slugs are lowercase alnum)
  return id.replace(/[^a-z0-9]/g, '')
}

/**
 * Slugs the home marquee shows, each with a self-hosted logo listed in
 * lib/brand-logos.json. Ids outside this set are dropped from the marquee.
 * Brands whose logos Simple Icons dropped for trademark reasons (Slack,
 * OpenAI, Twilio, Salesforce, AWS, Azure…) are intentionally absent; the full
 * catalog lives behind the "All N …" links.
 */
export const MARQUEE_SLUGS = new Set<string>([
  // integrations
  'github', 'notion', 'stripe', 'linear', 'jira', 'discord', 'gmail',
  'googlecalendar', 'googledrive', 'dropbox', 'box', 'figma', 'airtable',
  'asana', 'hubspot', 'intercom', 'sentry', 'shopify', 'telegram', 'whatsapp',
  'mailchimp', 'caldotcom', 'confluence', 'pagerduty', 'elevenlabs',
  'googlemaps', 'bigcommerce', 'calendly',
  // providers
  'anthropic', 'google', 'googlegemini', 'mistralai', 'deepseek', 'huggingface',
  'perplexity', 'vercel', 'openrouter', 'x', 'googlecloud', 'alibabacloud',
  'cloudflare', 'ollama', 'replicate',
])
