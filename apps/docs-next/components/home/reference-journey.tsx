import { createElement } from 'react'
import { ecosystemShowcase } from '@/lib/reference-journey'

export function ReferenceJourney() {
  return createElement(
    'agentskit-ecosystem',
    { current: 'agentskit' },
    <section
      aria-labelledby="ecosystem-fallback-title"
      className="border-y border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ak-graphite">
          The AgentsKit ecosystem
        </p>
        <h2
          id="ecosystem-fallback-title"
          className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-ak-foam sm:text-4xl md:text-5xl"
        >
          Build the agent. Then take it all the way.
        </h2>
        <p className="mt-5 max-w-2xl text-ak-graphite">
          One connected toolkit from ready-made source to governed production.
        </p>
        <ul className="mt-10 grid gap-px border border-ak-border bg-ak-border sm:grid-cols-2 lg:grid-cols-3">
          {ecosystemShowcase.map((product) => (
            <li key={product.id} className="bg-ak-midnight">
              <a
                href={product.href}
                className="block h-full p-6 text-ak-foam transition hover:bg-ak-surface"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ak-graphite">
                  {product.stage}
                </span>
                <span className="mt-2 block font-semibold">{product.name}</span>
                <span className="mt-2 block text-sm text-ak-graphite">{product.headline}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>,
  )
}
