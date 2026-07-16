import type { Metadata } from 'next'
import Link from 'next/link'
import { lists, counts } from '@/lib/ecosystem-stats'

export const metadata: Metadata = {
  title: 'Ecosystem — products and packages',
  description:
    'AgentsKit product mesh (seven properties) plus the monorepo package matrix — stability, integrations, providers, models, adapters, and skills.',
}

/** Canonical seven-product mesh (roles from ecosystem.json). */
const PRODUCT_MESH: ReadonlyArray<{
  id: string
  name: string
  role: string
  href: string
  blurb: string
  youAreHere?: boolean
}> = [
  {
    id: 'agentskit',
    name: 'AgentsKit',
    role: 'foundation',
    href: 'https://www.agentskit.io',
    blurb: 'Foundation library — runtime, tools, memory, RAG, and UI bindings.',
    youAreHere: true,
  },
  {
    id: 'registry',
    name: 'Registry',
    role: 'starting-point',
    href: 'https://registry.agentskit.io',
    blurb: 'Copy ready-to-use agent source into your repo.',
  },
  {
    id: 'agentskit-chat',
    name: 'AgentsKit Chat',
    role: 'experience',
    href: 'https://chat.agentskit.io',
    blurb: 'Opinionated product chat layer over AgentsKit primitives.',
  },
  {
    id: 'playbook',
    name: 'Playbook',
    role: 'discipline',
    href: 'https://playbook.agentskit.io',
    blurb: 'Engineering standards for agent-built software.',
  },
  {
    id: 'doc-bridge',
    name: 'Doc Bridge',
    role: 'understanding',
    href: 'https://agentskit-io.github.io/doc-bridge/',
    blurb: 'Human↔agent documentation handoffs.',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    role: 'verification',
    href: 'https://github.com/AgentsKit-io/code-review-cli',
    blurb: 'Focused model review before merge.',
  },
  {
    id: 'akos',
    name: 'AKOS',
    role: 'operation',
    href: 'https://akos.agentskit.io',
    blurb: 'Enterprise operation and governance.',
  },
]

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
          Products and packages
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ak-graphite">
          Two layers, one ecosystem: the <strong className="font-medium text-ak-foam">seven products</strong> you
          pick by job, and the <strong className="font-medium text-ak-foam">monorepo packages</strong> that power
          the foundation toolkit on this site.
        </p>
      </header>

      <section aria-labelledby="product-mesh" className="mt-14">
        <h2 id="product-mesh" className="font-mono text-sm uppercase tracking-wider text-ak-graphite">
          Product mesh
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ak-graphite">
          Canonical roles. Start where your problem is — not every team needs every product.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_MESH.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                className={`flex h-full flex-col rounded-lg border p-5 transition hover:border-ak-blue ${
                  p.youAreHere ? 'border-ak-blue/50 bg-ak-surface' : 'border-ak-border bg-ak-surface'
                }`}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ak-graphite">
                  {p.role}
                  {p.youAreHere ? ' · you are here (site)' : ''}
                </p>
                <h3 className="mt-1 font-semibold text-ak-foam">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ak-graphite">{p.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="By the numbers"
        className="mt-12 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-ak-graphite"
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
          Foundation package matrix
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ak-graphite">
          Installable <code className="text-ak-foam">@agentskit/*</code> packages in this monorepo — not the full
          product catalog above. Counts below are exact verified stats.
        </p>
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
