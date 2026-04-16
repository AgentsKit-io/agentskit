import Link from 'next/link'
import { SocialProofBar } from './_components/social-proof-bar'
import { InstallCommand } from './_components/install-command'
import { HeroDemo } from './_components/hero-demo/hero-demo'
import { ContributorWall } from '@/components/contribute/contributor-wall'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import { JsonLd } from '@/components/seo/json-ld'

export const metadata = {
  title: 'AgentsKit — Ship AI agents in JavaScript without gluing 8 libraries',
  description:
    'One toolkit for chat UI, tools, memory, RAG, and runtime. Swap OpenAI for Claude, React for terminal, in-memory for vector DB — nothing breaks. MIT, 10KB core.',
  openGraph: {
    title: 'AgentsKit — Ship AI agents in JavaScript',
    description:
      'Chat UI, tools, memory, RAG, runtime. One toolkit. Zero lock-in. 10KB core.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit — Ship AI agents in JavaScript',
    description:
      'Chat UI, tools, memory, RAG, runtime. One toolkit. Zero lock-in.',
  },
}

const GITHUB = 'https://github.com/EmersonBraun/agentskit'

const PACKAGE_CARDS = [
  { name: 'adapters', href: '/docs/data-layer/adapters' },
  { name: 'react', href: '/docs/chat-uis/react' },
  { name: 'ink', href: '/docs/chat-uis/ink' },
  { name: 'cli', href: '/docs/infrastructure/cli' },
  { name: 'runtime', href: '/docs/agents/runtime' },
  { name: 'tools', href: '/docs/agents/tools' },
  { name: 'skills', href: '/docs/agents/skills' },
  { name: 'memory', href: '/docs/data-layer/memory' },
  { name: 'rag', href: '/docs/data-layer/rag' },
  { name: 'sandbox', href: '/docs/infrastructure/sandbox' },
  { name: 'observability', href: '/docs/infrastructure/observability' },
  { name: 'eval', href: '/docs/infrastructure/eval' },
] as const

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.agentskit.io/#org',
      name: 'AgentsKit',
      url: 'https://www.agentskit.io',
      logo: 'https://www.agentskit.io/favicon.svg',
      sameAs: [
        'https://github.com/EmersonBraun/agentskit',
        'https://www.npmjs.com/org/agentskit',
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://www.agentskit.io/#software',
      name: 'AgentsKit',
      description:
        'One toolkit for building AI agents in JavaScript — chat UI, tools, memory, RAG, runtime. Swap OpenAI for Claude, React for terminal, in-memory for vector DB. Nothing breaks.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      url: 'https://www.agentskit.io',
      license: 'https://github.com/EmersonBraun/agentskit/blob/main/LICENSE',
      author: { '@id': 'https://www.agentskit.io/#org' },
      programmingLanguage: 'TypeScript',
      keywords: 'AI agents, JavaScript, TypeScript, LLM, streaming chat, RAG, tools, React',
    },
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
    <main className="flex w-full max-w-full flex-1 flex-col overflow-x-clip">
      <JsonLd data={JSON_LD} />
      <Hero />
      <SocialProofBar />
      <ProblemSection />
      <SolutionSection />
      <BenefitsSection />
      <ProviderStrip />
      <BuiltInOpenSection />
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
              agentskit
            </span>
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ak-border bg-ak-surface px-3 py-1 font-mono text-[11px] text-ak-graphite sm:mb-5 sm:text-xs">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-ak-green" />
            v1.0 · MIT · Built for the agent era
          </div>

          <h1 className="mb-5 max-w-2xl text-[2rem] font-bold leading-[1.08] tracking-tight text-ak-foam sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Ship AI agents in JavaScript.
            <span className="block text-ak-graphite">
              Without gluing 8 libraries together.
            </span>
          </h1>

          <p className="mb-7 max-w-xl text-base leading-relaxed text-ak-graphite sm:mb-8 sm:text-lg">
            AgentsKit gives you chat UI, tools, memory, RAG, and runtime — one
            toolkit, zero lock-in. Swap{' '}
            <span className="text-ak-foam">OpenAI for Claude</span>, React for
            terminal, in-memory for vector DB.{' '}
            <span className="text-ak-foam">Nothing breaks.</span>
          </p>

          <InstallCommand />

          <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-4 py-2.5 text-sm font-semibold text-ak-midnight transition hover:bg-white sm:px-5"
            >
              Install in 30 seconds →
            </Link>
            <Link
              href="/docs/examples"
              className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-4 py-2.5 text-sm font-medium text-ak-foam transition hover:border-ak-blue sm:px-5"
            >
              See a live agent
            </Link>
          </div>

          <p className="mt-4 font-mono text-[11px] leading-relaxed text-ak-graphite sm:text-xs">
            MIT · Works with OpenAI, Anthropic, Gemini, Ollama, Vercel AI SDK,
            LangChain
          </p>
        </div>

        <div className="min-w-0">
          <HeroDemo />
          <p className="mt-3 text-center font-mono text-[11px] leading-relaxed text-ak-graphite sm:text-xs">
            Agent renders real React components — not markdown.{' '}
            <Link href="/docs/examples/agent-actions" className="text-ak-blue hover:underline">
              See how →
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

function _HeroCodeDemo() {
  return (
    <div className="rounded-xl border border-ak-border bg-ak-surface shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-ak-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ak-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f0b429]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ak-green/70" />
        </div>
        <span className="font-mono text-xs text-ak-graphite">app.tsx</span>
        <span className="font-mono text-xs text-ak-green">◉ streaming</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-ak-foam">
        <code>
          <span className="text-ak-blue">import</span>{' '}
          <span className="text-ak-foam">{'{ useChat }'}</span>{' '}
          <span className="text-ak-blue">from</span>{' '}
          <span className="text-ak-green">{"'@agentskit/react'"}</span>
          {'\n'}
          <span className="text-ak-blue">import</span>{' '}
          <span className="text-ak-foam">{'{ anthropic }'}</span>{' '}
          <span className="text-ak-blue">from</span>{' '}
          <span className="text-ak-green">{"'@agentskit/adapters'"}</span>
          {'\n\n'}
          <span className="text-ak-blue">export default function</span>{' '}
          <span className="text-[#d2a8ff]">Chat</span>() {'{'}
          {'\n  '}
          <span className="text-ak-blue">const</span> {'{ messages, send }'} ={' '}
          <span className="text-[#d2a8ff]">useChat</span>({'{'}
          {'\n    '}adapter: <span className="text-[#d2a8ff]">anthropic</span>
          ({'{ model: '}
          <span className="text-ak-green">{"'claude-sonnet-4-6'"}</span> {'}),'}
          {'\n    '}tools: [<span className="text-ak-foam">webSearch</span>,{' '}
          <span className="text-ak-foam">readFile</span>],
          {'\n    '}memory: <span className="text-[#d2a8ff]">vector</span>(),
          {'\n  '}
          {'})\n\n  '}
          <span className="text-ak-blue">return</span> {'<'}
          <span className="text-[#7ee787]">ChatContainer</span>
          {' messages={messages} onSend={send} />'}
          {'\n'}
          {'}'}
        </code>
      </pre>
      <div className="border-t border-ak-border px-5 py-3 font-mono text-xs text-ak-graphite">
        <span className="text-ak-blue">→</span> streams tokens · tool calls ·
        memory · <span className="text-ak-green">works today</span>
      </div>
    </div>
  )
}

function ProblemSection() {
  return (
    <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-red sm:mb-4 sm:text-xs">
          The problem
        </p>
        <h2 className="mb-6 text-[1.75rem] font-bold leading-[1.15] text-ak-foam sm:mb-8 sm:text-3xl md:text-4xl lg:text-5xl">
          Building agents in JS today is a glue job.
        </h2>
        <div className="grid gap-4 text-base leading-relaxed text-ak-graphite sm:text-lg md:grid-cols-2 md:gap-6">
          <Pain>
            LangChain is bloated. Vercel AI SDK hits walls past a chat box.
          </Pain>
          <Pain>
            Swap OpenAI → Anthropic and half your prompt plumbing rewrites.
          </Pain>
          <Pain>
            Memory breaks across sessions. Tools don&apos;t port across
            runtimes.
          </Pain>
          <Pain>
            Browser, terminal, server — three codebases for the same agent.
          </Pain>
        </div>
      </div>
    </section>
  )
}

function Pain({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-ak-border bg-ak-surface p-5">
      <span className="mt-1 font-mono text-ak-red">✗</span>
      <span>{children}</span>
    </div>
  )
}

function SolutionSection() {
  return (
    <section className="border-b border-ak-border bg-ak-surface/40 px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-green sm:mb-4 sm:text-xs">
          The fix
        </p>
        <h2 className="mb-4 max-w-3xl text-[1.75rem] font-bold leading-[1.15] text-ak-foam sm:mb-5 sm:text-3xl md:text-4xl lg:text-5xl">
          One toolkit. Twelve packages. Pick what you need.
        </h2>
        <p className="mb-8 max-w-2xl text-base text-ak-graphite sm:mb-12 sm:text-lg">
          A 10KB zero-dependency core defines six contracts. Every adapter,
          tool, skill, memory, retriever, and runtime is substitutable — so
          your code survives provider changes, UI changes, and scale.
        </p>

        <div className="overflow-hidden rounded-xl border border-ak-border bg-ak-midnight p-5 sm:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 text-center sm:mb-6">
              <Link
                href="/docs/packages/core"
                className="inline-block rounded-md border border-ak-blue/30 bg-ak-blue/10 px-3 py-2 font-mono text-[12px] text-ak-blue transition hover:bg-ak-blue/20 sm:px-4 sm:text-sm"
              >
                @agentskit/core · 10KB · zero deps
              </Link>
            </div>
            <div className="mx-auto mb-4 h-8 w-px bg-ak-border" />
            <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-ak-graphite">
              ↓ click any package to open its docs
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {PACKAGE_CARDS.map(pkg => (
                <Link
                  key={pkg.name}
                  href={pkg.href}
                  className="group flex min-w-0 items-center justify-between gap-1.5 rounded-md border border-ak-border bg-ak-surface px-2.5 py-2 text-center font-mono text-[12px] text-ak-foam transition hover:border-ak-blue hover:text-ak-blue hover:shadow-[0_0_0_1px_var(--ak-blue)] sm:gap-2 sm:px-3 sm:text-sm"
                  aria-label={`Open docs for ${pkg.name}`}
                >
                  <span className="min-w-0 flex-1 truncate text-left">{pkg.name}</span>
                  <span className="shrink-0 text-xs opacity-0 transition group-hover:opacity-100" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-center font-mono text-[11px] text-ak-graphite">
              every card links to its docs ·{' '}
              <Link href="/docs" className="underline decoration-dotted underline-offset-2 hover:text-ak-blue">
                browse all →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function BenefitsSection() {
  const benefits = [
    {
      title: 'Swap providers without a rewrite',
      desc: 'OpenAI, Anthropic, Gemini, Grok, Ollama, DeepSeek. Same adapter contract. Change one line.',
      icon: '⇄',
    },
    {
      title: 'Same code, browser to terminal',
      desc: 'useChat() in React. Same hooks in Ink. Same runtime on server. Write once.',
      icon: '▣',
    },
    {
      title: 'Start at 10KB, grow to full stack',
      desc: 'Ship a chat box today. Add tools, RAG, memory, eval when you need them. Never rewrite.',
      icon: '↗',
    },
    {
      title: 'Agent-first, not chat-first',
      desc: 'ReAct loops, reflection, planning, multi-agent delegation — built in. Not bolted on.',
      icon: '◈',
    },
    {
      title: 'Tools that actually work',
      desc: 'Browser, filesystem, search, email, code exec. Strict contract. Parallel calls. Human approval.',
      icon: '⚙',
    },
    {
      title: 'Observable by default',
      desc: 'LangSmith, OpenTelemetry, console. Every LLM call, tool, memory op — traced. Optional, non-blocking.',
      icon: '◉',
    },
  ]
  return (
    <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-blue sm:mb-4 sm:text-xs">
          Why teams ship with it
        </p>
        <h2 className="mb-10 max-w-2xl text-[1.75rem] font-bold leading-[1.15] text-ak-foam sm:mb-14 sm:text-3xl md:text-4xl lg:text-5xl">
          Built for the code you&apos;ll still want to own in 12 months.
        </h2>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map(b => (
            <div
              key={b.title}
              className="group rounded-xl border border-ak-border bg-ak-surface p-6 transition hover:border-ak-blue"
            >
              <div className="mb-4 font-mono text-2xl text-ak-blue">
                {b.icon}
              </div>
              <h3 className="mb-2 font-semibold text-ak-foam">{b.title}</h3>
              <p className="text-sm leading-relaxed text-ak-graphite">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProviderStrip() {
  const providers = [
    'OpenAI',
    'Anthropic',
    'Gemini',
    'Grok',
    'Ollama',
    'DeepSeek',
    'Kimi',
    'LangChain',
    'LangGraph',
    'Vercel AI SDK',
  ]
  return (
    <section className="border-b border-ak-border bg-ak-surface/30 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl text-center">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ak-graphite sm:mb-8 sm:text-xs">
          Works with what you already use
        </p>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 sm:gap-x-8">
          {providers.map(p => (
            <span
              key={p}
              className="font-mono text-sm text-ak-graphite transition hover:text-ak-foam"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function BuiltInOpenSection() {
  return (
    <section className="border-b border-ak-border bg-ak-midnight px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <ContributorWall />
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
            href="/docs"
            className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-5 py-3 text-sm font-semibold text-ak-midnight transition hover:bg-white sm:px-6"
          >
            Read the docs →
          </Link>
          <a
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-5 py-3 text-sm font-medium text-ak-foam transition hover:border-ak-blue sm:px-6"
          >
            Star on GitHub
          </a>
          <Link
            href="/docs/contribute"
            className="inline-flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-5 py-3 text-sm font-medium text-ak-foam transition hover:border-ak-blue sm:px-6"
          >
            Contribute →
          </Link>
        </div>

        <p className="mt-8 font-mono text-xs text-ak-graphite">
          MIT · 14 packages on npm · built in the open
        </p>
      </div>
    </section>
  )
}
