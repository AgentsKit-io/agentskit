import { Icon } from './ui'

export function ClosingCta({ agentCount }: { agentCount: number }) {
  return (
    <section data-home-surface="closing-cta" aria-labelledby="registry-closing-cta" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-8 py-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">Start with working source</p>
          <h2 id="registry-closing-cta" className="mt-3 max-w-2xl font-display text-3xl font-semibold text-ak-foam sm:text-4xl">
            Start with a working agent. Own every line.
          </h2>
          <p className="mt-4 max-w-2xl text-ak-graphite">
            Explore {agentCount} ready-to-use agents, copy one into your codebase, and shape it to your stack.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <a
            href="/agents"
            className="inline-flex items-center gap-2 rounded-lg bg-ak-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Explore all agents <Icon name="arrow-right" size={17} />
          </a>
          <a
            href="/docs/quick-start"
            className="inline-flex items-center gap-2 rounded-lg border border-ak-border bg-ak-surface px-4 py-2.5 text-sm font-semibold text-ak-foam transition hover:border-ak-blue"
          >
            Read the quick start
          </a>
        </div>
      </div>
    </section>
  )
}
