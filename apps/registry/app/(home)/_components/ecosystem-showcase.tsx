import { createElement } from 'react'

export function EcosystemShowcase() {
  return createElement(
    'agentskit-ecosystem',
    { current: 'registry' },
    <section className="border-t border-ak-border bg-ak-midnight px-4 py-16 text-ak-foam sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-wider text-ak-blue">The AgentsKit ecosystem</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold sm:text-4xl">
          Start from working source. Take the agent all the way.
        </h2>
        <p className="mt-4 max-w-2xl text-ak-graphite">
          Registry is the discovery layer in one connected toolkit, from JavaScript foundation to governed production.
        </p>
      </div>
    </section>,
  )
}
