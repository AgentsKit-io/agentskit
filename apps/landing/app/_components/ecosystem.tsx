import { LINKS } from './links'

/** Append ecosystem UTM params to a cross-property URL. Pure; no analytics dep. */
function withUtm(url: string, medium: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', 'agentskit')
    u.searchParams.set('utm_medium', medium)
    u.searchParams.set('utm_campaign', 'ecosystem')
    return u.toString()
  } catch {
    return url
  }
}

type Property = {
  name: string
  goal: string
  body: string
  href?: string
  here?: boolean
}

const PROPERTIES: Property[] = [
  {
    name: 'AgentsKit',
    goal: 'Build an agent from scratch',
    body: 'The toolkit: core, adapters, runtime, tools, memory, RAG, and UI for every framework.',
    here: true,
  },
  {
    name: 'Registry',
    goal: 'Drop in a ready-made agent',
    body: 'The shadcn for agents — copy-paste, installable agents.',
    href: LINKS.registry,
  },
  {
    name: 'AKOS',
    goal: 'Run agents in production',
    body: 'AgentsKit OS — the operating system for AI agents in production. Managed cloud or self-hosted.',
    href: LINKS.akos,
  },
  {
    name: 'Playbook',
    goal: 'Learn enterprise best practices',
    body: 'Methodology and patterns for building production agents.',
    href: LINKS.playbook,
  },
]

const cardCls =
  'flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-6 transition hover:border-[var(--color-accent)]'

export function Ecosystem() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="mb-3 text-center text-3xl font-semibold tracking-tight">One ecosystem, one job each</h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-[var(--color-fg-soft)]">
        Grab what you want from AgentsKit, follow best practices in the Playbook, drop in ready-made
        agents from the Registry, and run them in production on AKOS.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PROPERTIES.map(p => {
          const inner = (
            <>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-fg-soft)]">
                {p.goal}
              </p>
              <h3 className="mb-2 text-lg font-semibold">
                {p.name}
                {p.here && (
                  <span className="ml-2 align-middle text-xs font-normal text-[var(--color-success)]">
                    you&apos;re here
                  </span>
                )}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-fg-soft)]">{p.body}</p>
              {p.href && (
                <span className="mt-4 text-sm font-medium text-[var(--color-accent)]">Visit {p.name} →</span>
              )}
            </>
          )
          return p.href ? (
            <a key={p.name} href={withUtm(p.href, 'ecosystem-section')} className={cardCls}>
              {inner}
            </a>
          ) : (
            <div key={p.name} className={cardCls}>
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}
