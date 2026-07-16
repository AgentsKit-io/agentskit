import Link from 'next/link'
import { counts, lists } from '@/lib/ecosystem-stats'
import { brandSlug } from '@/lib/brand-slugs'
import { CliShowcase } from './cli-showcase'
import { ComposeShowcase } from './compose-showcase'
import { LogoMarquee, type MarqueeItem } from './logo-marquee'

type Cta = { href: string; text: string }

function CtaLink({ cta }: { cta: Cta }) {
  return (
    <Link
      href={cta.href}
      className="mt-5 inline-flex items-center gap-1.5 font-mono text-sm text-ak-blue transition hover:gap-2.5 hover:text-ak-foam"
    >
      {cta.text} <span aria-hidden="true">→</span>
    </Link>
  )
}

function Section({
  eyebrow,
  title,
  blurb,
  cta,
  children,
  alt,
}: {
  eyebrow: string
  title: string
  blurb: string
  cta: Cta
  children: React.ReactNode
  alt?: boolean
}) {
  return (
    <section
      className={`px-4 py-16 sm:px-6 sm:py-20 ${alt ? 'bg-ak-surface/40' : 'bg-ak-midnight'}`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:gap-12 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite/60">{eyebrow}</div>
          <h2 className="mt-2 text-[1.6rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-3xl md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 max-w-md text-ak-graphite">{blurb}</p>
          <CtaLink cta={cta} />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}

function pretty(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Simple Icons slugs verified (curl, 2026-06) to resolve to a real logo on the
 * CDN. The marquee shows logos only (no text), so an id without a live logo
 * would render broken — we filter to this set and dedupe by slug. Brands whose
 * logos Simple Icons dropped for trademark reasons (Slack, OpenAI, Twilio,
 * Salesforce, AWS, Azure…) are intentionally absent; the full catalog lives
 * behind the "All N …" links. Re-run scripts/check-brand-logos if logos break.
 */
const VERIFIED_SLUGS = new Set<string>([
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

/** Proper display names where title-casing the id reads wrong. */
const LABEL_OVERRIDES: Record<string, string> = {
  github: 'GitHub',
  hubspot: 'HubSpot',
  pagerduty: 'PagerDuty',
  whatsapp: 'WhatsApp',
  elevenlabs: 'ElevenLabs',
  bigcommerce: 'BigCommerce',
  'cal-com': 'Cal.com',
  maps: 'Google Maps',
  deepseek: 'DeepSeek',
  huggingface: 'Hugging Face',
  openrouter: 'OpenRouter',
  xai: 'xAI',
  'google-vertex': 'Vertex AI',
  'cloudflare-ai-gateway': 'Cloudflare',
}

/** Items with a live logo, one per slug (drops 404s and slug collisions). */
function logoItems(ids: string[]): MarqueeItem[] {
  const seen = new Set<string>()
  const out: MarqueeItem[] = []
  for (const id of ids) {
    const slug = brandSlug(id)
    if (!VERIFIED_SLUGS.has(slug) || seen.has(slug)) continue
    seen.add(slug)
    out.push({ id, label: LABEL_OVERRIDES[id] ?? pretty(id) })
  }
  return out
}

export function CliSection() {
  return (
    <Section
      eyebrow="CLI"
      title="Add and run agents in one line."
      blurb="`npx agentskit add <agent>` copies the source into your project — you own the code. `--run` executes it on any provider."
      cta={{ href: '/docs/reference/packages/cli', text: 'Read the CLI docs' }}
    >
      <CliShowcase />
    </Section>
  )
}

export function ComposeSection() {
  return (
    <Section
      eyebrow="Compose"
      title="Tools, RAG, MCP, memory, permissions."
      blurb="Every agent is overridable. Wire web search, an MCP server, a retriever, memory, and a permission gate — all optional, no glue code."
      cta={{ href: '/docs/reference/packages/runtime', text: 'See how it composes' }}
      alt
    >
      <ComposeShowcase />
    </Section>
  )
}

/**
 * One band for the whole catalog — integrations on the top row, model
 * providers on the bottom. Replaces the two back-to-back marquees so the page
 * shows scale once, with breathing room.
 */
export function WorksWithSection() {
  return (
    <section className="overflow-hidden bg-ak-midnight py-16 sm:py-20">
      <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite/60">
          Works with everything
        </div>
        <h2 className="mt-2 text-[1.6rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-3xl md:text-4xl">
          One contract. Every tool, every model.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ak-graphite">
          {counts.integrations} built-in integrations and {counts.catalogProviders} providers
          ({counts.catalogModels.toLocaleString('en-US')} models) behind a single contract — Slack,
          Notion, Stripe, OpenAI, Anthropic, and the long tail.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6">
          <CtaLink cta={{ href: '/docs/agents/tools/integrations', text: `All ${counts.integrations} integrations` }} />
          <CtaLink cta={{ href: '/docs/data/providers', text: `All ${counts.catalogProviders} providers` }} />
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 sm:px-6">
        <LogoMarquee items={logoItems(lists.integrations)} duration={50} />
        <LogoMarquee items={logoItems(lists.providers)} duration={58} reverse />
      </div>
    </section>
  )
}
