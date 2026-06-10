import Link from 'next/link'
import { counts, lists } from '@/lib/ecosystem-stats'
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
      className={`border-b border-ak-border px-4 py-16 sm:px-6 sm:py-20 ${alt ? 'bg-ak-surface/40' : 'bg-ak-midnight'}`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:gap-12 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">{eyebrow}</div>
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

/**
 * Full-bleed marquee band — heading centered above, the logo rows span the
 * whole viewport width so there is room to read every chip as it scrolls.
 */
function MarqueeBand({
  eyebrow,
  title,
  blurb,
  cta,
  items,
  alt,
}: {
  eyebrow: string
  title: string
  blurb: string
  cta: Cta
  items: MarqueeItem[]
  alt?: boolean
}) {
  const half = Math.ceil(items.length / 2)
  return (
    <section
      className={`overflow-hidden border-b border-ak-border py-16 sm:py-20 ${alt ? 'bg-ak-surface/40' : 'bg-ak-midnight'}`}
    >
      <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">{eyebrow}</div>
        <h2 className="mt-2 text-[1.6rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-3xl md:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ak-graphite">{blurb}</p>
        <CtaLink cta={cta} />
      </div>
      <div className="flex flex-col gap-3">
        <LogoMarquee items={items.slice(0, half)} duration={50} />
        <LogoMarquee items={items.slice(half)} duration={58} reverse />
      </div>
    </section>
  )
}

function pretty(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function toItems(ids: string[]): MarqueeItem[] {
  return ids.map((id) => ({ id, label: pretty(id) }))
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

export function IntegrationsSection() {
  return (
    <MarqueeBand
      eyebrow="Integrations"
      title={`${counts.integrations} built-in integrations.`}
      blurb="Slack, Notion, Stripe, GitHub, Linear, Jira, and dozens more — one contract, ready to call."
      cta={{ href: '/docs/agents/tools/integrations', text: `All ${counts.integrations} integrations & how to use` }}
      items={toItems(lists.integrations)}
    />
  )
}

export function LlmsSection() {
  return (
    <MarqueeBand
      eyebrow="Models"
      title={`${counts.catalogProviders} providers, ${counts.catalogModels.toLocaleString()} models.`}
      blurb="OpenAI, Anthropic, Google, Mistral, Groq, and the long tail — one adapter contract, fed by the models.dev catalog."
      cta={{ href: '/docs/data/providers', text: `All ${counts.catalogProviders} providers & how to use` }}
      items={toItems(lists.providers.slice(0, 64))}
      alt
    />
  )
}
