import type { CSSProperties } from 'react'
import { referenceJourney } from '@/lib/reference-journey'

export function ReferenceJourney() {
  return (
    <section
      aria-labelledby="reference-journey-title"
      className="border-y border-ak-border bg-ak-bg px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ak-muted sm:text-xs">
          Continue with context
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] md:items-end md:gap-10">
          <h2
            id="reference-journey-title"
            className="max-w-3xl font-display text-3xl font-bold tracking-tight text-ak-fg sm:text-4xl"
          >
            One foundation. A useful next step for every stage.
          </h2>
          <p className="text-sm leading-relaxed text-ak-muted sm:text-base">
            These are contextual handoffs, not another catalog. Start with the problem you
            have now; every product remains optional.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {referenceJourney.map((item, index) => (
            <li key={item.id} className="min-w-0">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ '--journey-accent': item.accent } as CSSProperties}
                className="group flex h-full min-h-44 flex-col rounded-xl border border-ak-border border-t-[3px] [border-top-color:var(--journey-accent)] bg-ak-surface p-5 transition duration-[var(--ak-dur-base)] hover:-translate-y-0.5 hover:border-ak-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ak-blue motion-reduce:transform-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-ak-muted">
                    {String(index + 1).padStart(2, '0')} · {item.maturity}
                  </span>
                  <span aria-hidden="true" className="text-ak-muted transition group-hover:text-ak-fg">
                    ↗
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-ak-fg">
                  {item.action}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ak-muted">{item.context}</p>
                <span className="mt-auto pt-5 font-mono text-xs font-semibold text-ak-fg">
                  {item.name}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
