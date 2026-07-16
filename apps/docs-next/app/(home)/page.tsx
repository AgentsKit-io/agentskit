import Link from 'next/link'
import { InstallCommand } from './_components/install-command'
import { HeroDemo } from './_components/hero-demo/hero-demo'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import { JsonLd } from '@/components/seo/json-ld'
import { FadeIn } from '@/components/motion/fade-in'
import {
  CliSection,
  ComposeSection,
  WorksWithSection,
} from '@/components/home/showcases'
import { Icon } from '@/components/home/icons'
import { BrandIcon } from '@/components/home/brand-icon'
import { ReferenceJourney } from '@/components/home/reference-journey'
import { counts, approx } from '@/lib/ecosystem-stats'
import { agentsKitIdentity } from '@/lib/reference-journey'

export const metadata = {
  title: `${agentsKitIdentity.name}.js — ${agentsKitIdentity.promise}`,
  description: `${agentsKitIdentity.promise} A composable TypeScript foundation for runtime, tools, memory, RAG, and chat interfaces.`,
  openGraph: {
    title: 'AgentsKit.js — Ship AI agents in JavaScript',
    description:
      'Composable TypeScript foundation: runtime, tools, memory, RAG, adapters, and headless UI bindings. Zero lock-in. Under 10KB core.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit.js — Ship AI agents in JavaScript',
    description:
      'Composable TypeScript foundation: runtime, tools, memory, RAG, adapters, and headless UI bindings. Zero lock-in.',
  },
}

const GITHUB = 'https://github.com/AgentsKit-io/agentskit'
// Discord hidden until the community is large enough to warrant it. Restore when ready.
// const DISCORD = 'https://discord.gg/zx6z2p4jVb'

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.agentskit.io/#org',
      name: 'AgentsKit.js',
      url: 'https://www.agentskit.io',
      logo: 'https://www.agentskit.io/favicon.svg',
      sameAs: [
        'https://github.com/AgentsKit-io/agentskit',
        'https://www.npmjs.com/org/agentskit',
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://www.agentskit.io/#software',
      name: 'AgentsKit.js',
      description: agentsKitIdentity.promise,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      url: 'https://www.agentskit.io',
      license: 'https://github.com/AgentsKit-io/agentskit/blob/main/LICENSE',
      author: { '@id': 'https://www.agentskit.io/#org' },
      programmingLanguage: 'TypeScript',
      keywords: 'AI agents, autonomous agent, multi-agent, JavaScript, TypeScript, LLM, streaming chat, RAG, tools, memory, observability, React, Vue, Svelte, Next.js, OpenAI, Anthropic Claude, Gemini, Ollama, LangChain',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.agentskit.io/#website',
      url: 'https://www.agentskit.io',
      name: 'AgentsKit.js',
      publisher: { '@id': 'https://www.agentskit.io/#org' },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://www.agentskit.io/docs?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function HomePage() {
  return (
    <main className="flex w-full max-w-full flex-1 flex-col overflow-x-clip">
      <JsonLd data={JSON_LD} />
      <Hero />
      <WorksWithSection />
      <CliSection />
      <ComposeSection />
      <EcosystemStats />
      <ReferenceJourney />
      <FinalCta />
      <SiteFooter />
    </main>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-ak-midnight px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
      <div className="mx-auto grid max-w-6xl gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3 sm:mb-6">
            <AnimatedLogo variant="hero" size={44} loop />
            <span className="font-mono text-lg font-bold tracking-tight text-ak-foam sm:text-xl">
              agentskit<span className="text-ak-graphite">.js</span>
            </span>
            <span className="rounded-full border border-ak-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ak-graphite">
              {agentsKitIdentity.role} · {agentsKitIdentity.maturity}
            </span>
          </div>

          <FadeIn>
            <h1 className="mb-5 max-w-2xl text-[2rem] font-bold leading-[1.08] tracking-tight text-ak-foam sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
              Ship AI agents in JavaScript.
              <span className="block text-ak-graphite">
                Without gluing 8 libraries together.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
          <p className="mb-7 max-w-xl text-base leading-relaxed text-ak-graphite sm:mb-8 sm:text-lg">
            Runtime, tools, memory, RAG, adapters, and headless UI bindings in one foundation.
            Swap <span className="text-ak-foam">OpenAI for Claude</span>, React for
            terminal, in-memory for vector DB — without a rewrite.
          </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <InstallCommand />
          </FadeIn>

          <FadeIn delay={0.3}>
            <HeroFrameworks />
          </FadeIn>

          <FadeIn delay={0.35}>
            <p className="mt-6 max-w-xl border-l-2 border-ak-green pl-4 text-sm leading-relaxed text-ak-graphite">
              Built for {agentsKitIdentity.audience}
            </p>
          </FadeIn>
        </div>

        <div className="min-w-0">
          <HeroDemo />
          <p className="mt-3 text-center font-mono text-[11px] leading-relaxed text-ak-graphite sm:text-xs">
            The chat in this site&apos;s corner is built with{' '}
            <span className="text-ak-foam">AgentsKit Chat</span> on this foundation.{' '}
            <a href="https://chat.agentskit.io/" className="text-ak-blue hover:underline">
              Build product chats →
            </a>
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <Link
              href="/docs/get-started/getting-started/build-your-first-agent"
              className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-4 py-2.5 text-sm font-semibold text-ak-midnight transition hover:bg-white sm:px-5"
            >
              Build your first agent →
            </Link>
            <Link
              href="/docs/reference/examples"
              className="inline-flex items-center gap-2 px-2 py-2.5 text-sm font-medium text-ak-graphite transition hover:text-ak-foam sm:px-3"
            >
              See live examples →
            </Link>
          </div>
        </div>
      </div>

      <dl className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-ak-border bg-ak-border sm:grid-cols-4 lg:mt-16">
        {agentsKitIdentity.proof.slice(0, 4).map((claim) => (
          <div key={claim.id} className="bg-ak-midnight px-4 py-4 sm:px-5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ak-graphite">
              verified in repo
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-ak-foam sm:text-base">
              {claim.value.toLocaleString('en-US')} {claim.noun}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// Theme-aware fills (Angular near-black, Deno/Bun invisible at one theme end)
// are handled centrally in <BrandIcon> so these stay declarative.
const FRAMEWORKS: { slug: string; label: string }[] = [
  { slug: 'react', label: 'React' },
  { slug: 'vuedotjs', label: 'Vue' },
  { slug: 'svelte', label: 'Svelte' },
  { slug: 'solid', label: 'Solid' },
  { slug: 'angular', label: 'Angular' },
  { slug: 'nodedotjs', label: 'Node' },
  { slug: 'deno', label: 'Deno' },
  { slug: 'bun', label: 'Bun' },
]

/** Quiet static proof that the UI layer spans every framework. No animation. */
function HeroFrameworks() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ak-graphite/60">
        Works with
      </span>
      {FRAMEWORKS.map((f) => (
        <BrandIcon key={f.label} slug={f.slug} label={f.label} size={22} imgClass="h-[22px] w-[22px]" />
      ))}
    </div>
  )
}

const LAYERS = [
  { name: 'Adapters', icon: 'adapters', href: '/docs/data/providers', meta: `${counts.nativeAdapters} adapters · ${approx(counts.catalogProviders)} providers` },
  { name: 'UI', icon: 'ui', href: '/docs/ui', meta: `${counts.frameworkBindings} frameworks` },
  { name: 'Runtime', icon: 'runtime', href: '/docs/reference/packages/runtime', meta: 'ReAct · planning · multi-agent' },
  { name: 'Tools', icon: 'tools', href: '/docs/agents/tools/integrations', meta: `${counts.integrations} integrations` },
  { name: 'Skills', icon: 'skills', href: '/docs/agents/skills/personas', meta: `${counts.skills} ready-made` },
  { name: 'Memory', icon: 'memory', href: '/docs/data/memory', meta: `${counts.memoryBackends} backends` },
  { name: 'RAG', icon: 'rag', href: '/docs/reference/packages/rag', meta: 'chunk · embed · retrieve' },
  { name: 'Observability', icon: 'observability', href: '/docs/reference/packages/observability', meta: 'traces · LangSmith · OTel' },
] as const

// Percent-coordinate arcs (viewBox 0 0 100 100, preserveAspectRatio none → maps
// 1:1 onto the diagram box). One dest per layer row; rows are evenly stacked so
// each center sits at (i + 0.5) / 8 of the height. Source = core's right edge.
const ARC_DESTS = [6.25, 18.75, 31.25, 43.75, 56.25, 68.75, 81.25, 93.75]
const arcPath = (y: number) => `M 21 50 C 42 50, 42 ${y}, 63 ${y}`

function EcosystemStats() {
  return (
    <section className="bg-ak-midnight px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-graphite/60 sm:mb-4 sm:text-xs">
          The ecosystem
        </p>
        <h2 className="mb-3 max-w-3xl text-[1.75rem] font-bold leading-[1.15] text-ak-foam sm:text-3xl md:text-4xl">
          One core. Everything else plugs in.
        </h2>
        <p className="mb-10 max-w-2xl text-sm text-ak-graphite sm:mb-12 sm:text-base">
          Six contracts on one tiny core. Every layer is optional and swappable —
          click any to dive in.
        </p>

        <div className="relative mt-10">
          {/* animated convergence arcs (md+), AKOS-style flowing packets */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
          >
            {ARC_DESTS.map((y, i) => (
              <g key={y}>
                {/* static line */}
                <path
                  d={arcPath(y)}
                  pathLength={100}
                  fill="none"
                  stroke="var(--ak-accent)"
                  strokeWidth={1}
                  strokeOpacity={0.22}
                  vectorEffect="non-scaling-stroke"
                />
                {/* traveling dot */}
                <path
                  d={arcPath(y)}
                  pathLength={100}
                  fill="none"
                  stroke="var(--ak-accent)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="ak-flow-out"
                  style={{ animationDelay: `${-Math.floor(i / 2)}s` }}
                />
              </g>
            ))}
          </svg>

          <div className="relative grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] md:items-stretch md:gap-10">
            <div className="self-center rounded-2xl bg-ak-surface/60 p-6">
              <div className="font-mono text-sm text-ak-graphite">@agentskit/core</div>
              <div className="mt-2 font-mono text-4xl font-bold text-ak-foam">&lt; 10 KB</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ak-graphite/70">
                zero dependencies
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ak-graphite">
                Types, events, and six contracts. Every package plugs into this — swap
                any layer without touching the rest.
              </p>
            </div>

            <ul className="flex flex-col justify-between md:ml-auto md:w-[440px]">
              {LAYERS.map((l) => (
                <li key={l.name}>
                  <Link
                    href={l.href}
                    className="group flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-ak-surface/50"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ak-surface text-ak-blue transition group-hover:bg-ak-blue group-hover:text-ak-midnight">
                      <Icon name={l.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-mono text-sm font-medium text-ak-foam transition group-hover:text-ak-blue">
                      {l.name}
                    </span>
                    <span className="ml-auto text-right font-mono text-[11px] text-ak-graphite sm:text-xs">
                      {l.meta}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ak-midnight px-4 py-24 sm:px-6 sm:py-28 md:py-32">
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center">
          <AnimatedLogo variant="hero" size={60} loop />
        </div>
        <div className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] text-ak-graphite/70 sm:text-xs">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ak-green" />
          {counts.packages} packages · {approx(counts.catalogProviders)} providers · MIT
        </div>
        <h2 className="mb-5 text-[2.25rem] font-bold leading-[1.05] tracking-tight text-ak-foam sm:text-5xl md:text-6xl lg:text-7xl">
          Build the agent.
          <span className="block text-ak-graphite">Skip the plumbing.</span>
        </h2>
        <p className="mx-auto mb-9 max-w-xl text-base text-ak-graphite sm:mb-10 sm:text-lg">
          One install. First streaming agent in under 10 lines. Swap providers,
          UI, and memory without a rewrite. No signup, no lock-in — MIT all the way down.
        </p>

        <div className="mx-auto mb-7 inline-block w-full max-w-xl text-left">
          <InstallCommand withSubtext />
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
          <Link
            href="/docs/get-started/getting-started/build-your-first-agent"
            className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-6 py-3 text-sm font-semibold text-ak-midnight transition hover:bg-white sm:px-7"
          >
            Build your first agent →
          </Link>
          <a
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-ak-graphite transition hover:text-ak-foam sm:px-5"
          >
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  const columns = [
    {
      title: 'Start',
      links: [
        { text: 'Get started', href: '/docs/get-started/getting-started/build-your-first-agent' },
        { text: 'Live examples', href: '/docs/reference/examples' },
        { text: 'Recipes', href: '/docs/reference/recipes' },
        { text: 'Stack builder', href: '/stack' },
        { text: 'Learn', href: '/learn' },
      ],
    },
    {
      title: 'Build',
      links: [
        { text: 'Chat UI', href: '/docs/ui' },
        { text: 'CLI', href: '/docs/reference/packages/cli' },
        { text: 'Runtime', href: '/docs/reference/packages/runtime' },
        { text: 'Tools & MCP', href: '/docs/agents/tools' },
        { text: 'RAG & Memory', href: '/docs/data/memory' },
        { text: 'All packages', href: '/ecosystem' },
      ],
    },
    {
      title: 'Ecosystem',
      links: [
        { text: 'Libs', href: '/' },
        { text: 'Registry · agents', href: 'https://registry.agentskit.io' },
        { text: 'Playbook · standards', href: 'https://playbook.agentskit.io' },
        { text: 'AKOS · production OS', href: 'https://akos.agentskit.io' },
      ],
    },
    {
      title: 'Community',
      links: [
        { text: 'GitHub', href: GITHUB },
        { text: 'Contribute', href: '/docs/reference/contribute' },
        { text: 'Showcase', href: '/showcase' },
        { text: 'Blog', href: '/blog' },
        { text: 'For agents · llms.txt', href: '/llms.txt' },
      ],
    },
  ] as const

  return (
    <footer className="bg-ak-midnight px-4 pt-16 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <AnimatedLogo variant="nav" loop />
              <span className="font-mono text-base font-bold tracking-tight text-ak-foam">
                agentskit<span className="text-ak-graphite">.js</span>
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-ak-graphite">
              The complete agent toolkit for JavaScript — chat UI, runtime,
              tools, memory, RAG, and production guardrails in one ecosystem.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-ak-surface/60 px-3 py-1.5 font-mono text-xs text-ak-graphite transition hover:text-ak-foam"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/org/agentskit"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-ak-surface/60 px-3 py-1.5 font-mono text-xs text-ak-graphite transition hover:text-ak-foam"
              >
                npm
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="min-w-0">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ak-graphite/70">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.text}>
                    {l.href.startsWith('http') ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-ak-graphite transition hover:text-ak-blue"
                      >
                        {l.text}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-ak-graphite transition hover:text-ak-blue"
                      >
                        {l.text}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-ak-border pt-6 sm:flex-row">
          <p className="font-mono text-[11px] text-ak-graphite sm:text-xs">
            © AgentsKit.js · MIT · {counts.packages} packages on npm · built in the open
          </p>
          <p className="font-mono text-[11px] text-ak-graphite/70 sm:text-xs">
            {counts.integrations} integrations · {approx(counts.catalogProviders)} providers · {approx(counts.catalogModels)} models
          </p>
        </div>
      </div>
    </footer>
  )
}
