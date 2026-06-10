import { ChatPreview } from '@/components/learn/chat-preview'
import { counts, lists } from '@/lib/ecosystem-stats'
import { CliShowcase } from './cli-showcase'
import { ComposeShowcase } from './compose-showcase'
import { LogoMarquee, type MarqueeItem } from './logo-marquee'

function Section({
  eyebrow,
  title,
  blurb,
  children,
  alt,
}: {
  eyebrow: string
  title: string
  blurb: string
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
        </div>
        <div className="min-w-0">{children}</div>
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

export function ChatSection() {
  return (
    <Section
      eyebrow="Chat UI"
      title="Streaming chat, drop-in."
      blurb="Headless React + Ink components — streaming, tool calls, memory, skills. Swap the adapter, keep the UI."
    >
      <div className="rounded-xl border border-ak-border bg-ak-surface/40 p-2">
        <ChatPreview />
      </div>
    </Section>
  )
}

export function CliSection() {
  return (
    <Section
      eyebrow="CLI"
      title="Add and run agents in one line."
      blurb="`npx agentskit add <agent>` copies the source into your project — you own the code. `--run` executes it on any provider."
      alt
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
    >
      <ComposeShowcase />
    </Section>
  )
}

export function IntegrationsSection() {
  const items = toItems(lists.integrations)
  return (
    <Section
      eyebrow="Integrations"
      title={`${counts.integrations} built-in integrations.`}
      blurb="Slack, Notion, Stripe, GitHub, Linear, Jira, and dozens more — one contract, ready to call."
      alt
    >
      <div className="flex flex-col gap-3">
        <LogoMarquee items={items.slice(0, Math.ceil(items.length / 2))} duration={42} />
        <LogoMarquee items={items.slice(Math.ceil(items.length / 2))} duration={48} reverse />
      </div>
    </Section>
  )
}

export function LlmsSection() {
  const items = toItems(lists.providers.slice(0, 48))
  return (
    <Section
      eyebrow="Models"
      title={`${counts.catalogProviders} providers, ${counts.catalogModels.toLocaleString()} models.`}
      blurb="OpenAI, Anthropic, Google, Mistral, Groq, and the long tail — one adapter contract, fed by the models.dev catalog."
    >
      <div className="flex flex-col gap-3">
        <LogoMarquee items={items.slice(0, Math.ceil(items.length / 2))} duration={44} />
        <LogoMarquee items={items.slice(Math.ceil(items.length / 2))} duration={50} reverse />
      </div>
    </Section>
  )
}
