import type { Metadata } from 'next'
import { lists, counts } from '@/lib/ecosystem-stats'

export const metadata: Metadata = {
  title: 'Ecosystem',
  description:
    'The AgentsKit ecosystem at a glance — every package, its stability, and the integrations, providers, models, adapters, and skills that ship with it.',
}

const STABILITY_RANK: Record<string, number> = {
  stable: 0,
  beta: 1,
  alpha: 2,
  experimental: 3,
  unlisted: 4,
}

function rankOf(stability: string): number {
  const key = stability.toLowerCase()
  return key in STABILITY_RANK ? STABILITY_RANK[key] : STABILITY_RANK.unlisted
}

function badgeClasses(stability: string): string {
  switch (stability.toLowerCase()) {
    case 'stable':
      return 'border-ak-green/40 text-ak-green'
    case 'beta':
      return 'border-ak-blue/40 text-ak-blue'
    default:
      return 'border-ak-border text-ak-graphite'
  }
}

export default function EcosystemPage() {
  const packages = [...lists.packages].sort((a, b) => {
    const byRank = rankOf(a.stability) - rankOf(b.stability)
    return byRank !== 0 ? byRank : a.name.localeCompare(b.name)
  })

  const numbers: { label: string; value: number }[] = [
    { label: 'packages', value: counts.packages },
    { label: 'integrations', value: counts.integrations },
    { label: 'providers', value: counts.catalogProviders },
    { label: 'models', value: counts.catalogModels },
    { label: 'native adapters', value: counts.nativeAdapters },
    { label: 'skills', value: counts.skills },
  ]

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="font-mono text-sm text-ak-blue">/ecosystem</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ak-foam sm:text-5xl">
          The AgentsKit ecosystem
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ak-graphite">
          One toolkit for the agent era — every package is independently
          installable, plug-and-play, and interoperable. Here is the whole
          surface area, with each package&apos;s current stability.
        </p>
      </header>

      <section
        aria-label="By the numbers"
        className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-ak-graphite"
      >
        {numbers.map((n, i) => (
          <span key={n.label} className="inline-flex items-center">
            {i > 0 && <span className="mx-2 text-ak-border">·</span>}
            <span className="text-ak-foam">{n.value}</span>
            <span className="ml-1.5">{n.label}</span>
          </span>
        ))}
      </section>

      <section aria-label="Package matrix" className="mt-12">
        <h2 className="font-mono text-sm uppercase tracking-wider text-ak-graphite">
          Package matrix
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <li
              key={pkg.name}
              className="flex flex-col rounded-lg border border-ak-border bg-ak-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-sm text-ak-foam">
                  {pkg.name}
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${badgeClasses(
                    pkg.stability,
                  )}`}
                >
                  {pkg.stability}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ak-graphite">
                {pkg.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
