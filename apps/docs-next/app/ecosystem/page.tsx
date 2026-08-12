import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import ecosystem from '@/lib/ecosystem.json'
import { lists, counts } from '@/lib/ecosystem-stats'
import { canonicalUrl } from '@/lib/canonical-url'

export const metadata: Metadata = {
  title: 'Ecosystem — products and packages',
  description: ecosystem.positioning.metaDescription,
  alternates: { canonical: canonicalUrl('/ecosystem') },
}

const PRODUCT_MESH = ecosystem.products.map((product) => ({
  id: product.id,
  name: product.shortName,
  role: product.role,
  href: product.surfaces.home,
  blurb: product.promise,
  youAreHere: product.id === 'agentskit',
  accessModel: product.accessModel,
}))

const ACCESS_LABELS = {
  'open-source': 'Free · open source',
  'paid-managed-service': 'Optional · paid managed service',
} as const

function accessLabel(accessModel: string): string {
  if (accessModel in ACCESS_LABELS) {
    return ACCESS_LABELS[accessModel as keyof typeof ACCESS_LABELS]
  }
  throw new TypeError(`Unknown ecosystem access model: ${accessModel}`)
}

const ECOSYSTEM_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  '@id': 'https://www.agentskit.io/ecosystem#products',
  name: 'AgentsKit ecosystem',
  description: `${ecosystem.positioning.canonicalDescription} ${ecosystem.positioning.commercialBoundary}`,
  numberOfItems: ecosystem.products.length,
  itemListElement: ecosystem.products.map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'SoftwareApplication',
      name: product.name,
      url: product.surfaces.home,
      description: product.promise,
      applicationCategory: 'DeveloperApplication',
      isAccessibleForFree: product.accessModel === 'open-source',
      ...(product.accessModel === 'open-source'
        ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }
        : {}),
      additionalProperty: {
        '@type': 'PropertyValue',
        name: 'Access model',
        value: accessLabel(product.accessModel),
      },
    },
  })),
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
      <JsonLd data={ECOSYSTEM_JSON_LD} />
      <header className="max-w-2xl">
        <p className="font-mono text-sm text-ak-blue">/ecosystem</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ak-foam sm:text-5xl">
          Products and packages
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ak-graphite">
          {ecosystem.positioning.canonicalDescription} The product mesh solves the full path from building and
          delivering agents to governing them in production; the package matrix is the composable foundation
          underneath it.
        </p>
      </header>

      <section className="mt-10 rounded-lg border border-ak-green/40 bg-ak-surface p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-green">Commercial model</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ak-foam">
          Open by default. Managed only when you need it.
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-ak-graphite">
          {ecosystem.positioning.commercialBoundary}
        </p>
      </section>

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
                <p className="mt-2 font-mono text-[11px] text-ak-green">
                  {accessLabel(p.accessModel)}
                </p>
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

      <section className="mt-16 rounded-lg border border-ak-blue/40 bg-ak-surface p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">Public footprint</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ak-foam">
          Follow the ecosystem beyond this site
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ak-graphite">
          Browse verified MCP registries, technical publications, independent listings, trust signals, and contributor resources.
        </p>
        <Link
          href="/resources"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-ak-blue px-4 font-medium text-ak-ink transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
        >
          Explore public resources
        </Link>
      </section>
    </main>
  )
}
