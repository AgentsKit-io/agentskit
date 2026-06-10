import Link from 'next/link'
import { InstallCommand } from './_components/install-command'
import { HeroDemo } from './_components/hero-demo/hero-demo'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import { JsonLd } from '@/components/seo/json-ld'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion/fade-in'
import {
  CliSection,
  ComposeSection,
  IntegrationsSection,
  LlmsSection,
} from '@/components/home/showcases'
import { counts, approx } from '@/lib/ecosystem-stats'

export const metadata = {
  title: 'AgentsKit.js — Ship AI agents in JavaScript without gluing 8 libraries',
  description:
    'One ecosystem for chat UI, runtime, tools, memory, RAG, and production guardrails. Start with one package, grow into the full stack. MIT, 10KB core.',
  openGraph: {
    title: 'AgentsKit.js — Ship AI agents in JavaScript',
    description:
      'Chat UI, runtime, tools, memory, RAG, observability. One ecosystem. Zero lock-in. 10KB core.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit.js — Ship AI agents in JavaScript',
    description:
      'Chat UI, runtime, tools, memory, RAG, observability. One ecosystem. Zero lock-in.',
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
      description:
        'One ecosystem for building AI agents in JavaScript — chat UI, runtime, tools, memory, RAG, and production guardrails. Start with one package, grow into the full stack.',
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
      <IntegrationsSection />
      <LlmsSection />
      <CliSection />
      <ComposeSection />
      <EcosystemStats />
      <ProofSection />
      <FinalCta />
      <SiteFooter />
    </main>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ak-border bg-ak-midnight px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
      <div className="mx-auto grid max-w-6xl gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3 sm:mb-6">
            <AnimatedLogo variant="hero" size={44} loop />
            <span className="font-mono text-lg font-bold tracking-tight text-ak-foam sm:text-xl">
              agentskit<span className="text-ak-graphite">.js</span>
            </span>
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ak-border bg-ak-surface px-3 py-1 font-mono text-[11px] text-ak-graphite sm:mb-5 sm:text-xs">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-ak-green" />
            core v1.0 · {counts.packages} packages · MIT
          </div>

          <FadeIn>
            <h1 className="mb-5 max-w-2xl text-[2rem] font-bold leading-[1.08] tracking-tight text-ak-foam sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-ak-foam via-ak-blue to-ak-foam bg-clip-text text-transparent">
                Ship AI agents in JavaScript.
              </span>
              <span className="block text-ak-graphite">
                Without gluing 8 libraries together.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
          <p className="mb-7 max-w-xl text-base leading-relaxed text-ak-graphite sm:mb-8 sm:text-lg">
            AgentsKit gives you chat UI, runtime, tools, memory, RAG, and
            production guardrails in one ecosystem. Swap{' '}
            <span className="text-ak-foam">OpenAI for Claude</span>, React for
            terminal, in-memory for vector DB. Start small, grow into the
            full stack, and keep your code intact.
          </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <InstallCommand />
          </FadeIn>
        </div>

        <div className="min-w-0">
          <HeroDemo />
          <p className="mt-3 text-center font-mono text-[11px] leading-relaxed text-ak-graphite sm:text-xs">
            Agent renders real React components — not markdown.{' '}
            <Link href="/docs/reference/examples/agent-actions" className="text-ak-blue hover:underline">
              See how →
            </Link>
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
              className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-4 py-2.5 text-sm font-medium text-ak-foam transition hover:border-ak-blue sm:px-5"
            >
              See live examples
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function EcosystemStats() {
  const stats = [
    { value: String(counts.packages), label: 'packages', href: '/docs/reference/packages' },
    { value: String(counts.frameworkBindings), label: 'framework bindings', href: '/docs/ui' },
    { value: approx(counts.catalogProviders), label: 'LLM providers', href: '/docs/data/providers' },
    { value: `${counts.integrations}+`, label: 'tool integrations', href: '/docs/agents/tools/integrations' },
    { value: `${counts.recipes}+`, label: 'recipes', href: '/docs/reference/recipes' },
    { value: String(counts.skills), label: 'ready-made skills', href: '/docs/agents/skills/personas' },
    { value: `${counts.memoryBackends}+`, label: 'memory backends', href: '/docs/data/memory' },
    { value: '< 10 KB', label: 'zero-dep core', href: '/docs/reference/packages/core' },
  ]
  return (
    <section className="border-b border-ak-border bg-ak-midnight px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-green sm:mb-4 sm:text-xs">
          The ecosystem
        </p>
        <h2 className="mb-8 max-w-3xl text-[1.75rem] font-bold leading-[1.15] text-ak-foam sm:mb-10 sm:text-3xl md:text-4xl">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" stagger={0.05}>
          {stats.map((s) => (
            <StaggerItem key={s.label}>
            <Link
              href={s.href}
              className="group block rounded-xl border border-ak-border bg-ak-surface p-5 transition hover:-translate-y-0.5 hover:border-ak-blue hover:shadow-[0_0_0_1px_var(--ak-blue)]"
            >
              <div className="mb-1 font-mono text-2xl font-bold text-ak-foam transition group-hover:text-ak-blue sm:text-3xl">
                {s.value}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-ak-graphite sm:text-xs">
                {s.label}
              </div>
            </Link>
            </StaggerItem>
          ))}
        </Stagger>
        <p className="mt-6 text-sm text-ak-graphite">
          Every number above is a click-through. Install what you need; the core stays under 10 KB gzipped.
        </p>

        <div className="mt-12 border-t border-ak-border pt-10">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-blue sm:text-xs">
            Beyond the libraries
          </p>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {ECOSYSTEM_PROPERTIES.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-xl border border-ak-border bg-ak-surface p-6 transition hover:-translate-y-0.5 hover:border-ak-blue hover:shadow-[0_0_0_1px_var(--ak-blue)]"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-mono text-base font-bold text-ak-foam transition group-hover:text-ak-blue">
                    {p.name}
                  </span>
                  <span className="font-mono text-sm text-ak-graphite transition group-hover:text-ak-blue">
                    ↗
                  </span>
                </div>
                <span className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ak-green">
                  {p.tag}
                </span>
                <p className="text-sm leading-relaxed text-ak-graphite">{p.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const ECOSYSTEM_PROPERTIES = [
  {
    name: 'Registry',
    href: 'https://registry.agentskit.io',
    tag: 'Ready-made agents',
    desc: 'Copy production-ready agents into your project — research, PR review, support, and more. You own the source, zero lock-in.',
  },
  {
    name: 'Playbook',
    href: 'https://playbook.agentskit.io',
    tag: 'Best practices',
    desc: 'The engineering standards for building agents that ship — runtime validation, quality gates, security, and evals.',
  },
  {
    name: 'AKOS',
    href: 'https://akos.agentskit.io',
    tag: 'Production OS',
    desc: 'The operating system for agents at scale — orchestration, egress control, and RBAC for running agents in production.',
  },
] as const

function ProofSection() {
  const starters = [
    {
      title: 'Scaffold a starter',
      href: '/docs/production/cli/init',
      desc: 'Use `agentskit init` to spin up a React chat, Ink terminal app, runtime worker, or multi-agent starter.',
      cta: 'See starters',
    },
    {
      title: 'Browse live examples',
      href: '/docs/reference/examples',
      desc: 'Open interactive demos for support bots, code assistants, RAG chat, runtime agents, and multi-agent planning.',
      cta: 'Open examples',
    },
    {
      title: 'Copy runnable recipes',
      href: '/docs/reference/recipes',
      desc: 'Jump straight into end-to-end snippets for integrations, replay, security, evals, and retrieval pipelines.',
      cta: 'Open recipes',
    },
  ] as const

  return (
    <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-green sm:mb-4 sm:text-xs">
          Proof, not promises
        </p>
        <h2 className="mb-4 max-w-3xl text-[1.75rem] font-bold leading-[1.15] text-ak-foam sm:mb-5 sm:text-3xl md:text-4xl lg:text-5xl">
          Start from a template, a demo, or a runnable recipe.
        </h2>
        <p className="mb-8 max-w-2xl text-base text-ak-graphite sm:mb-12 sm:text-lg">
          Scaffold a project, inspect a live demo, or copy a recipe and run it
          locally. Pick the angle you trust.
        </p>
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
          {starters.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex flex-col rounded-xl border border-ak-border bg-ak-surface p-6 transition hover:-translate-y-0.5 hover:border-ak-blue hover:shadow-[0_0_0_1px_var(--ak-blue)]"
            >
              <h3 className="mb-3 text-xl font-semibold text-ak-foam transition group-hover:text-ak-blue">
                {item.title}
              </h3>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-ak-graphite">
                {item.desc}
              </p>
              <span className="font-mono text-sm text-ak-blue">
                {item.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-ak-border bg-ak-midnight px-4 py-24 sm:px-6 sm:py-28 md:py-32">
      {/* glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-ak-blue to-transparent opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[420px] w-[820px] max-w-none -translate-x-1/2 rounded-full bg-ak-blue/10 blur-[120px]"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center">
          <AnimatedLogo variant="hero" size={60} loop />
        </div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ak-border bg-ak-surface px-3 py-1 font-mono text-[11px] text-ak-graphite sm:text-xs">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ak-green" />
          {counts.packages} packages · {approx(counts.catalogProviders)} providers · MIT
        </div>
        <h2 className="mb-5 text-[2.25rem] font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-ak-foam via-ak-blue to-ak-foam bg-clip-text text-transparent">
            Build the agent.
          </span>
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
            className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-6 py-3 text-sm font-semibold text-ak-midnight shadow-[0_0_0_1px_var(--ak-blue),0_8px_30px_-12px_var(--ak-blue)] transition hover:bg-white sm:px-7"
          >
            Build your first agent →
          </Link>
          <a
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-6 py-3 text-sm font-medium text-ak-foam transition hover:border-ak-blue sm:px-7"
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
                className="rounded-md border border-ak-border bg-ak-surface px-3 py-1.5 font-mono text-xs text-ak-graphite transition hover:border-ak-blue hover:text-ak-foam"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/org/agentskit"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-ak-border bg-ak-surface px-3 py-1.5 font-mono text-xs text-ak-graphite transition hover:border-ak-blue hover:text-ak-foam"
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
