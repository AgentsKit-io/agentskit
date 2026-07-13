import { Icon } from './ui'

const GH = 'https://github.com/AgentsKit-io/agentskit-registry'

export function Hero({ agentCount, categoryCount, sampleIds }: { agentCount: number; categoryCount: number; sampleIds: string[] }) {
  const id = sampleIds[0] ?? 'research'
  const cmd = `npx agentskit add ${id}`

  return (
    <section className="border-b border-ak-border px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-5xl items-end gap-10 lg:grid-cols-[1fr_26rem]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">Ready-to-use AI agents</p>
          <h1 className="mt-3 max-w-3xl text-[2.35rem] font-bold leading-[1.08] tracking-tight text-ak-foam sm:text-5xl">
            Find an agent. Copy the source. Own the code.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-ak-graphite sm:text-lg">
            Browse {agentCount} validated, provider-agnostic agents. Install one command, then read and adapt every line.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="#agents"
            className="inline-flex items-center gap-2 rounded-lg bg-ak-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Browse agents <Icon name="arrow-right" size={17} />
          </a>
          <a
            href={GH}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-ak-border bg-ak-surface px-4 py-2.5 text-sm font-semibold text-ak-foam transition hover:border-ak-blue"
          >
            <Icon name="github" size={16} /> View on GitHub
          </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ak-graphite">
            <span><b className="text-ak-foam">{agentCount}</b> agents</span>
            <span><b className="text-ak-foam">{categoryCount}</b> categories</span>
            <span><b className="text-ak-green">Validated v1</b></span>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
          <div className="flex items-center gap-2 border-b border-ak-border px-4 py-3 text-xs text-ak-graphite">
            <Icon name="terminal" size={14} /> Install any agent
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-5 font-mono text-sm">
            <code className="min-w-0 truncate text-ak-foam"><span className="text-ak-blue">$</span> {cmd}</code>
            <button
              type="button"
              data-copy={cmd}
              aria-label="Copy install command"
              className="rg-copy inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ak-border bg-ak-midnight text-ak-graphite transition hover:border-ak-blue hover:text-ak-foam"
            >
              <span className="cp inline-flex"><Icon name="copy" size={15} /></span>
              <span className="ck"><Icon name="check" size={15} /></span>
            </button>
          </div>
          <p className="border-t border-ak-border px-4 py-3 text-xs text-ak-graphite">Source lands in your repository. No registry runtime or lock-in.</p>
        </div>
      </div>
    </section>
  )
}
