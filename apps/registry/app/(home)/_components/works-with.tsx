import { Icon } from './ui'
import { BrandIcon } from './brand-icon'

type Brand = { name: string; slug: string }
const integrations: Brand[] = [
  { name: 'Slack', slug: 'slack' }, { name: 'Notion', slug: 'notion' }, { name: 'Stripe', slug: 'stripe' },
  { name: 'GitHub', slug: 'github' }, { name: 'Gmail', slug: 'gmail' }, { name: 'Google Calendar', slug: 'googlecalendar' },
  { name: 'Google Drive', slug: 'googledrive' }, { name: 'Jira', slug: 'jira' }, { name: 'Linear', slug: 'linear' },
  { name: 'HubSpot', slug: 'hubspot' }, { name: 'Intercom', slug: 'intercom' }, { name: 'Discord', slug: 'discord' },
  { name: 'Telegram', slug: 'telegram' }, { name: 'WhatsApp', slug: 'whatsapp' }, { name: 'Shopify', slug: 'shopify' },
  { name: 'Airtable', slug: 'airtable' }, { name: 'Asana', slug: 'asana' }, { name: 'Confluence', slug: 'confluence' },
  { name: 'Dropbox', slug: 'dropbox' }, { name: 'Figma', slug: 'figma' }, { name: 'Sentry', slug: 'sentry' },
  { name: 'Mailchimp', slug: 'mailchimp' }, { name: 'ElevenLabs', slug: 'elevenlabs' }, { name: 'Cal.com', slug: 'caldotcom' },
  { name: 'Calendly', slug: 'calendly' }, { name: 'Google Maps', slug: 'googlemaps' },
]
const providers: Brand[] = [
  { name: 'OpenAI', slug: 'openai' }, { name: 'Anthropic', slug: 'anthropic' }, { name: 'Google', slug: 'google' },
  { name: 'Vertex AI', slug: 'googlecloud' }, { name: 'xAI', slug: 'x' }, { name: 'Mistral', slug: 'mistralai' },
  { name: 'DeepSeek', slug: 'deepseek' }, { name: 'Alibaba', slug: 'alibabacloud' }, { name: 'Cloudflare', slug: 'cloudflare' },
  { name: 'Hugging Face', slug: 'huggingface' }, { name: 'OpenRouter', slug: 'openrouter' }, { name: 'Perplexity', slug: 'perplexity' },
  { name: 'Vercel', slug: 'vercel' },
]
const intUrl = 'https://www.agentskit.io/docs/agents/tools/integrations'
const provUrl = 'https://www.agentskit.io/docs/data/providers'

function Chip({ b }: { b: Brand }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ak-border bg-ak-surface px-3.5 py-2">
      <BrandIcon slug={b.slug} label={b.name} size={18} />
      <span className="whitespace-nowrap font-mono text-sm text-ak-graphite">{b.name}</span>
    </span>
  )
}

export function WorksWith() {
  const intRow = [...integrations, ...integrations]
  const provRow = [...providers, ...providers]
  return (
    <section className="overflow-hidden px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rg-reveal font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">Works with everything</div>
        <h2 className="rg-reveal mt-2 text-2xl font-bold tracking-tight text-ak-foam sm:text-3xl">One contract. Every tool, every model.</h2>
        <p className="rg-reveal mt-2 max-w-2xl text-ak-graphite">
          Every agent you copy runs on the AgentsKit core — 50 built-in integrations and 140+ catalog
          providers (5,162 models) behind a single contract. Swap the model, provider, or tool without
          touching the rest.
        </p>
        <div className="rg-reveal mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <a href={intUrl} rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ak-blue hover:underline">
            All 50 integrations <Icon name="arrow-right" size={15} />
          </a>
          <a href={provUrl} rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ak-blue hover:underline">
            All 140+ providers <Icon name="arrow-right" size={15} />
          </a>
        </div>

        <div className="rg-marquee rg-reveal mt-8 grid gap-3.5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="overflow-hidden">
            <div className="rg-mqtrack">{intRow.map((b, i) => <Chip key={`i${i}`} b={b} />)}</div>
          </div>
          <div className="overflow-hidden">
            <div className="rg-mqtrack rev">{provRow.map((b, i) => <Chip key={`p${i}`} b={b} />)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
