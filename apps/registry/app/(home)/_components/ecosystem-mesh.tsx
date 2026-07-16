import Link from 'next/link'

/** Canonical peer products (Registry is the current surface — not listed). */
export const ecosystemPeers = [
  {
    name: 'AgentsKit',
    role: 'foundation',
    href: 'https://www.agentskit.io',
    action: 'Build and extend agents with core, tools, memory, and RAG.',
  },
  {
    name: 'AgentsKit Chat',
    role: 'experience',
    href: 'https://chat.agentskit.io',
    action: 'Deliver a native chat experience over the same runtime.',
  },
  {
    name: 'Agents Playbook',
    role: 'discipline',
    href: 'https://playbook.agentskit.io',
    action: 'Apply engineering and delivery standards for agent work.',
  },
  {
    name: 'Doc Bridge',
    role: 'understanding',
    href: 'https://doc-bridge.agentskit.io/',
    action: 'Keep documentation handoffs agent-ready and deterministic.',
  },
  {
    name: 'Code Review',
    role: 'verification',
    href: 'https://github.com/AgentsKit-io/code-review-cli',
    action: 'Review agent-generated diffs before merge.',
  },
  {
    name: 'AKOS',
    role: 'operation',
    href: 'https://akos.agentskit.io',
    action: 'Operate with enterprise controls and governance.',
  },
] as const

export function EcosystemMesh({
  headingId = 'continue-ecosystem',
}: {
  headingId?: string
}) {
  return (
    <section aria-labelledby={headingId} className="border-t border-ak-border px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-wider text-ak-blue">Continue with context</p>
        <h2 id={headingId} className="mt-3 max-w-2xl font-display text-3xl font-semibold text-ak-foam">
          Registry is the starting point. The next tool should match the next problem.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ak-graphite">
          You are on <strong className="font-medium text-ak-foam">AgentsKit Registry</strong> — ready-to-use agents
          you copy into your repo. Peers in the same ecosystem:
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystemPeers.map((step) => (
            <Link
              key={step.name}
              href={step.href}
              className="group min-h-36 border-t-2 border-ak-border bg-ak-surface p-5 transition hover:border-ak-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ak-blue"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ak-graphite">{step.role}</p>
              <h3 className="mt-1 font-semibold text-ak-foam group-hover:text-ak-blue">{step.name}</h3>
              <p className="mt-3 text-sm leading-6 text-ak-graphite">{step.action}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
