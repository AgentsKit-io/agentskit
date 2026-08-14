import { EcoLink } from './tracked-link'
import ecosystem from '../../lib/ecosystem.json'

type Property = {
  id: string
  name: string
  goal: string
  body: string
  href: string
  here: boolean
  managed: boolean
}

const GOALS: Record<string, string> = {
  agentskit: 'Build an agent from scratch',
  registry: 'Drop in a ready-made agent',
  'agentskit-chat': 'Deliver an agent experience',
  playbook: 'Apply production practices',
  'doc-bridge': 'Make documentation executable',
  'code-review': 'Verify a change before merge',
  akos: 'Optional managed operations',
}

const PROPERTIES: Property[] = ecosystem.products
  .filter((product) => product.public || product.distributionClass === 'managed-service')
  .sort((a, b) => a.navigation.order - b.navigation.order)
  .map((product) => ({
    id: product.id,
    name: product.name,
    goal: GOALS[product.id] ?? product.role,
    body: product.promise,
    href: product.surfaces.docs ?? product.surfaces.home ?? '#',
    here: product.id === 'agentskit',
    managed: product.distributionClass === 'managed-service',
  }))

const cardCls =
  'flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-6 transition hover:border-[var(--color-accent)]'

export function Ecosystem() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="mb-3 text-center text-3xl font-semibold tracking-tight">One ecosystem, one job each</h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-[var(--color-fg-soft)]">
        Pick the open-source product by the job you need next. AKOS is a separate optional managed layer, not a
        requirement for using the family.
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
                {p.managed && (
                  <span className="ml-2 align-middle text-xs font-normal text-[var(--color-success)]">
                    optional managed
                  </span>
                )}
                {p.here && (
                  <span className="ml-2 align-middle text-xs font-normal text-[var(--color-success)]">
                    you&apos;re here
                  </span>
                )}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-fg-soft)]">{p.body}</p>
              {!p.here && p.href && (
                <span className="mt-4 text-sm font-medium text-[var(--color-accent)]">Visit {p.name} →</span>
              )}
            </>
          )
          return p.here ? (
            <div key={p.id} className={cardCls}>{inner}</div>
          ) : (
            <EcoLink
              key={p.id}
              href={p.href}
              target={p.id}
              placement="ecosystem-section"
              className={cardCls}
            >
              {inner}
            </EcoLink>
          )
        })}
      </div>
    </section>
  )
}
