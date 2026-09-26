import Link from 'next/link'
import { createElement } from 'react'
import { InstallCommand } from './_components/install-command'
import { HeroDemo } from './_components/hero-demo/hero-demo'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import { JsonLd } from '@/components/seo/json-ld'
import {
  CliSection,
  WorksWithSection,
} from '@/components/home/showcases'
import { Icon } from '@/components/home/icons'
import { ReferenceJourney } from '@/components/home/reference-journey'
import { HeroHeadline, KineticFrameworkReel } from './_components/hero-motion'
import { counts, approx } from '@/lib/ecosystem-stats'
import { agentsKitIdentity } from '@/lib/reference-journey'
import softwareIdentity from '@/lib/software-identity.generated.json'

export const metadata = {
  title: `${agentsKitIdentity.name} — ${agentsKitIdentity.promise}`,
  description: `${agentsKitIdentity.promise} A composable TypeScript foundation for runtime, tools, memory, RAG, and chat interfaces.`,
  alternates: { canonical: 'https://www.agentskit.io' },
  openGraph: {
    title: 'AgentsKit — Ship AI agents in JavaScript',
    description:
      'Composable TypeScript foundation: runtime, tools, memory, RAG, adapters, and headless UI bindings. Zero lock-in. Under 10KB core.',
    type: 'website',
    url: 'https://www.agentskit.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit — Ship AI agents in JavaScript',
    description:
      'Composable TypeScript foundation: runtime, tools, memory, RAG, adapters, and headless UI bindings. Zero lock-in.',
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    softwareIdentity.organization,
    softwareIdentity.sourceCode,
    softwareIdentity.application,
    {
      '@type': 'WebSite',
      '@id': 'https://www.agentskit.io/#website',
      url: 'https://www.agentskit.io',
      name: 'AgentsKit',
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
    <div className="ak-home-layout flex w-full max-w-full flex-1 flex-col overflow-x-clip">
      {createElement('agentskit-aurora', { 'aria-hidden': 'true' })}
      <JsonLd data={JSON_LD} />
      <Hero />
      <WorksWithSection />
      <EcosystemStats />
      <CliSection />
      <ReferenceJourney />
      <FinalCta />
    </div>
  )
}

function Hero() {
  return (
    <section data-liquid-hero="" className="relative overflow-hidden px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3 sm:mb-6">
            <AnimatedLogo variant="hero" size={44} loop />
            <span className="font-mono text-lg font-bold tracking-tight text-ak-foam sm:text-xl">
              AgentsKit
            </span>
          </div>

          <HeroHeadline />

          <p className="mb-7 max-w-xl text-base leading-relaxed text-ak-graphite sm:mb-8 sm:text-lg">
            Runtime, tools, memory, RAG, adapters, and headless UI bindings in one foundation.
            Swap <span className="text-ak-foam">OpenAI for Claude</span>, React for
            terminal, in-memory for vector DB — without a rewrite.
          </p>

          <InstallCommand />
          <HeroFrameworks />
        </div>

        <div className="min-w-0">
          <HeroDemo />

          <div data-hero-actions="" className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <Link
              href="/docs/get-started/getting-started/build-your-first-agent"
              className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-4 py-2.5 text-sm font-semibold text-ak-midnight transition hover:bg-white sm:px-5"
            >
              Build your first agent →
            </Link>
            <a
              href="https://chat.agentskit.io/"
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-ak-graphite transition hover:text-ak-foam sm:px-3"
            >
              Explore Chat →
            </a>
          </div>
        </div>
      </div>

    </section>
  )
}

function HeroFrameworks() {
  return <KineticFrameworkReel />
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

function EcosystemFlow() {
  return (
    <svg
      data-ecosystem-flow="desktop"
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full md:block"
    >
      {ARC_DESTS.map((y, i) => (
        <g key={y}>
          <path
            d={arcPath(y)}
            pathLength={100}
            fill="none"
            stroke="var(--ak-accent)"
            strokeWidth={1}
            strokeOpacity={0.22}
            vectorEffect="non-scaling-stroke"
          />
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
  )
}

function EcosystemStats() {
  return (
    <section data-home-surface="ecosystem-map" className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-graphite sm:mb-4 sm:text-xs">
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
          <EcosystemFlow />

          <div className="relative z-10 grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] md:items-stretch md:gap-10">
            <div data-ecosystem-core="" className="self-center rounded-2xl p-6">
              <div className="font-mono text-sm text-ak-graphite">@agentskit/core</div>
              <div className="mt-2 font-mono text-4xl font-bold text-ak-foam">&lt; 10 KB</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ak-graphite">
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
    <section data-home-final-cta="" className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mb-5 text-[2.25rem] font-bold leading-[1.05] tracking-tight text-ak-foam sm:text-5xl md:text-6xl lg:text-7xl">
          Build the agent.
          <span className="block text-ak-graphite">Skip the plumbing.</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
          <Link
            href="/docs/get-started/getting-started/build-your-first-agent"
            className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-6 py-3 text-sm font-semibold text-ak-midnight transition hover:bg-white sm:px-7"
          >
            Build your first agent →
          </Link>
          <Link
            href="/docs/reference/contribute"
            className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-ak-graphite transition hover:text-ak-foam sm:px-5"
          >
            Contribute to AgentsKit
          </Link>
        </div>
      </div>
    </section>
  )
}
