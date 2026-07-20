import { Icon } from './ui'

export function ClosingCta({ agentCount }: { agentCount: number }) {
  return (
    <section aria-labelledby="registry-closing-cta" className="border-t border-ak-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-8 border-y border-ak-border py-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">Your next agent starts as owned source</p>
          <h2 id="registry-closing-cta" className="mt-3 max-w-2xl font-display text-3xl font-semibold text-ak-foam sm:text-4xl">
            Find your starting point. Own what happens next.
          </h2>
          <p className="mt-4 max-w-2xl text-ak-graphite">
            Choose from {agentCount} validated agents, install one command, and adapt every line to your stack and policy.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <a
            href="#agents"
            className="inline-flex items-center gap-2 rounded-lg bg-ak-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Browse {agentCount} agents <Icon name="arrow-right" size={17} />
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
