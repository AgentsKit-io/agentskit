import Link from 'next/link'
import { SocialProofBar } from './_components/social-proof-bar'
import { InstallCommand } from './_components/install-command'
import { HeroDemo } from './_components/hero-demo/hero-demo'
import { DownloadsBadge } from './_components/downloads-badge'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import { JsonLd } from '@/components/seo/json-ld'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion/fade-in'
import {
  ChatSection,
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
      <SocialProofBar />
      <EcosystemStats />
      <ChatSection />
      <CliSection />
      <ComposeSection />
      <IntegrationsSection />
      <LlmsSection />
      <ProofSection />
      <FinalCta />
    </main>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ak-border bg-ak-midnight px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
      <div className="mx-auto grid max-w-6xl gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
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

          <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
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
            {/* Discord hidden until the community is large enough to warrant it. Restore when ready.
            <a
              href={DISCORD}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-5 py-2.5 text-sm font-medium text-ak-foam transition hover:border-[#5865F2]"
            >
              Join Discord →
            </a>
            */}
          </div>

          <p className="mt-4 font-mono text-[11px] leading-relaxed text-ak-graphite sm:text-xs">
            MIT · Works with OpenAI, Anthropic, Gemini, Ollama, Vercel AI SDK,
            LangChain
          </p>

          <DownloadsBadge />
        </div>

        <div className="min-w-0">
          <HeroDemo />
          <p className="mt-3 text-center font-mono text-[11px] leading-relaxed text-ak-graphite sm:text-xs">
            Agent renders real React components — not markdown.{' '}
            <Link href="/docs/reference/examples/agent-actions" className="text-ak-blue hover:underline">
              See how →
            </Link>
          </p>
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
      </div>
    </section>
  )
}

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
    <section className="bg-ak-midnight px-4 py-20 sm:px-6 sm:py-24 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-5 flex justify-center sm:mb-6">
          <AnimatedLogo variant="hero" size={56} loop />
        </div>
        <h2 className="mb-4 text-[2rem] font-bold leading-[1.1] text-ak-foam sm:mb-5 sm:text-4xl md:text-5xl lg:text-6xl">
          Build the agent.{' '}
          <span className="text-ak-graphite">Skip the plumbing.</span>
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-base text-ak-graphite sm:mb-10 sm:text-lg">
          30 seconds to install. First streaming agent in under 10 lines. No
          credit card, no signup, no lock-in.
        </p>

        <div className="mx-auto mb-6 inline-block">
          <InstallCommand />
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
          <Link
            href="/docs/get-started/getting-started/build-your-first-agent"
            className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-5 py-3 text-sm font-semibold text-ak-midnight transition hover:bg-white sm:px-6"
          >
            Build your first agent →
          </Link>
          <a
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-5 py-3 text-sm font-medium text-ak-foam transition hover:border-ak-blue sm:px-6"
          >
            Star on GitHub
          </a>
          {/* Discord hidden until the community is large enough to warrant it. Restore when ready.
          <a
            href={DISCORD}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-6 py-3 text-sm font-medium text-ak-foam transition hover:border-[#5865F2]"
          >
            Join Discord
          </a>
          */}
          <Link
            href="/docs/reference/contribute"
            className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-5 py-3 text-sm font-medium text-ak-foam transition hover:border-ak-blue sm:px-6"
          >
            Contribute →
          </Link>
        </div>

        <p className="mt-8 font-mono text-xs text-ak-graphite">
          AgentsKit.js · MIT · {counts.packages} packages on npm · built in the open
        </p>

        <nav
          aria-label="AgentsKit ecosystem"
          className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-ak-border pt-6 text-xs text-ak-graphite"
        >
          <span className="font-mono uppercase tracking-[0.18em] text-ak-graphite/70">Ecosystem</span>
          <a href="https://playbook.agentskit.io" className="transition hover:text-ak-blue">
            Playbook<span className="text-ak-graphite/60"> · best practices</span>
          </a>
          <a href="https://registry.agentskit.io" className="transition hover:text-ak-blue">
            Registry<span className="text-ak-graphite/60"> · ready-made agents</span>
          </a>
          <a href="https://akos.agentskit.io" className="transition hover:text-ak-blue">
            AKOS<span className="text-ak-graphite/60"> · the OS for agents in production</span>
          </a>
        </nav>
      </div>
    </section>
  )
}
