import { createElement } from 'react'
import { ecosystemPeers } from './ecosystem-mesh'

export function EcosystemShowcase() {
  return createElement(
    'agentskit-ecosystem',
    { current: 'registry' },
    <section className="border-t border-ak-border bg-ak-midnight px-4 py-16 text-ak-foam sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-wider text-ak-blue">The AgentsKit ecosystem</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold sm:text-4xl">
          Build the agent. Then take it all the way.
        </h2>
        <p className="mt-4 max-w-2xl text-ak-graphite">
          One connected toolkit from ready-made source to optional managed operations.
        </p>
        <nav aria-label="AgentsKit ecosystem" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystemPeers.map((peer) => (
            <a
              key={peer.name}
              href={peer.href}
              className="border-t-2 border-ak-border bg-ak-surface p-5 transition hover:border-ak-blue"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ak-graphite">{peer.role}</span>
              <span className="mt-1 block font-semibold text-ak-foam">{peer.name}</span>
              <span className="mt-2 block text-sm leading-6 text-ak-graphite">{peer.action}</span>
            </a>
          ))}
        </nav>
      </div>
    </section>,
  )
}
