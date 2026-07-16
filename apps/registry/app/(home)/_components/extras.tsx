import { Icon, CopyButton } from './ui'

const GH = 'https://github.com/AgentsKit-io/agentskit-registry'

const FEATURES = [
  { icon: 'lock', t: 'No lock-in', d: 'The code lands in your repo. Edit it freely — no runtime dependency on this registry.' },
  { icon: 'layers', t: 'Production-shaped', d: 'Skills, tools, env, and human-in-the-loop wired the way real agents ship.' },
  { icon: 'sparkles', t: 'Agent-friendly', d: 'Every agent is machine-discoverable via JSON, llms.txt, and an MCP endpoint.' },
]

export function WhatIs() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rg-reveal font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">Copy the source. Own the agent.</div>
        <h2 className="rg-reveal mt-2 text-2xl font-bold tracking-tight text-ak-foam sm:text-3xl">Install an agent the way you install a component</h2>
        <p className="rg-reveal mt-2 max-w-2xl text-ak-graphite">
          Each agent is a small, self-contained factory wiring published @agentskit/* packages into a one-call
          function. The CLI copies that source into your project so you can read it, edit it, and keep it.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="rg-reveal rounded-xl border border-ak-border bg-ak-surface p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-ak-blue/20 bg-ak-blue/10 text-ak-blue">
                <Icon name={f.icon} size={20} />
              </span>
              <h3 className="mt-3.5 text-lg font-semibold text-ak-foam">{f.t}</h3>
              <p className="mt-1.5 text-sm text-ak-graphite">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PromptSection({ prompt }: { prompt: string }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rg-reveal font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">Bring your own agent</div>
        <h2 className="rg-reveal mt-2 text-2xl font-bold tracking-tight text-ak-foam sm:text-3xl">Bring your own agent</h2>
        <p className="rg-reveal mt-2 mb-6 max-w-2xl text-ak-graphite">
          Copy a ready instruction block and paste it into Claude, Cursor, or any coding agent.
        </p>
        <div className="rg-reveal rounded-xl border border-ak-blue/25 bg-gradient-to-b from-ak-blue/5 to-transparent p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-semibold text-ak-foam">
              <span className="text-ak-blue"><Icon name="sparkles" size={15} /></span> Copy for your agent
            </span>
            <CopyButton value={prompt} variant="ghost" />
          </div>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ak-border bg-ak-midnight p-4 font-mono text-[13px] leading-relaxed text-ak-graphite">{prompt}</pre>
        </div>
      </div>
    </section>
  )
}

export function StarCta() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rg-reveal relative overflow-hidden rounded-3xl border border-ak-blue/30 bg-ak-surface px-7 py-12 text-center">
          <div className="pointer-events-none absolute -top-1/2 left-1/2 h-80 w-[520px] -translate-x-1/2 rounded-full bg-ak-blue/10 blur-3xl" />
          <span className="relative grid h-14 w-14 mx-auto place-items-center rounded-2xl border border-ak-blue/30 bg-ak-blue/10 text-ak-blue">
            <Icon name="github" size={26} />
          </span>
          <h2 className="relative mt-4 text-2xl font-bold tracking-tight text-ak-foam">Star us on GitHub</h2>
          <p className="relative mx-auto mt-3 max-w-md text-ak-graphite">
            The registry is open-source and MIT-licensed. A star helps more builders find it.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <a href={GH} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg bg-ak-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
              <Icon name="github" size={17} /> Star the registry
            </a>
            <a href="https://www.agentskit.io" rel="noopener" className="inline-flex items-center gap-2 rounded-lg border border-ak-border bg-ak-midnight px-4 py-2.5 text-sm font-semibold text-ak-foam transition hover:border-ak-blue">
              Explore the ecosystem <Icon name="arrow-right" size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
