import type { Metadata } from 'next'
import Link from 'next/link'
import { lists, counts } from '@/lib/ecosystem-stats'
import ecosystem from '@/lib/ecosystem.json'
import { JsonLd } from '@/components/seo/json-ld'
import { canonicalUrl } from '@/lib/canonical-url'

export const metadata: Metadata = {
  title: 'Ecosystem — products and packages',
  description: ecosystem.positioning.metaDescription,
  alternates: { canonical: canonicalUrl('/ecosystem') },
}

const PRODUCT_BLURBS: Record<string, string> = {
  agentskit: 'Foundation library — runtime, tools, memory, RAG, and UI bindings.',
  registry: 'Copy ready-to-use agent source into your repo.',
  'agentskit-chat': 'Opinionated product chat layer over AgentsKit primitives.',
  playbook: 'Engineering standards for agent-built software.',
  'doc-bridge': 'Human↔agent documentation handoffs.',
  'code-review': 'Focused model review before merge.',
  akos: 'Optional managed operations for teams that need additional production controls. AgentsKit can be used without it.',
}

/** Product mesh derived from the canonical ecosystem manifest. */
const PRODUCT_MESH = ecosystem.products
  .filter((product) => product.surfaces.home)
  .map((product) => ({
    id: product.id,
    name: product.name,
    kind: product.kind,
    role: product.id === 'akos' ? 'optional · managed' : product.role,
    href: product.surfaces.home ?? product.surfaces.docs ?? '#',
    blurb: PRODUCT_BLURBS[product.id] ?? product.promise,
    managed: product.distributionClass === 'managed-service',
    youAreHere: product.id === 'agentskit',
  }))

const ECOSYSTEM_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': 'https://www.agentskit.io/ecosystem#page',
      name: 'AgentsKit ecosystem — products and packages',
      description: `${ecosystem.positioning.canonicalDescription} ${ecosystem.positioning.commercialBoundary}`,
      url: 'https://www.agentskit.io/ecosystem',
    },
    {
      '@type': 'ItemList',
      '@id': 'https://www.agentskit.io/ecosystem#products',
      name: 'AgentsKit ecosystem products',
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', url: canonicalUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Ecosystem', url: canonicalUrl('/ecosystem') },
        ],
      },
      numberOfItems: PRODUCT_MESH.length,
      itemListElement: PRODUCT_MESH.map((product, index) => {
        const manifestProduct = ecosystem.products.find((candidate) => candidate.id === product.id)
        const managed = manifestProduct?.distributionClass === 'managed-service'
        const structuredType = product.kind === 'methodology' ? 'CreativeWork' : 'SoftwareApplication'
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            ...(managed ? { '@type': 'Service' } : { '@type': structuredType }),
            name: product.name,
            description: product.blurb,
            isAccessibleForFree: !managed,
            url: product.href,
            ...(managed
              ? { serviceType: 'Managed operations' }
              : { codeRepository: manifestProduct?.repo ? `https://github.com/${manifestProduct.repo}` : undefined }),
          },
        }
      }),
    },
  ],
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
          Two layers, one ecosystem: the <strong className="font-medium text-ak-foam">open-source product family</strong>
          you pick by job, plus <strong className="font-medium text-ak-foam">optional managed operations</strong> when
          production governance calls for it. The <strong className="font-medium text-ak-foam">monorepo packages</strong>
          power the AgentsKit foundation.
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
                  p.managed ? 'border-ak-green/40 bg-ak-surface' : p.youAreHere ? 'border-ak-blue/50 bg-ak-surface' : 'border-ak-border bg-ak-surface'
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

      <section aria-labelledby="public-proof" className="mt-14 rounded-lg border border-ak-border bg-ak-surface p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">Public proof</p>
        <h2 id="public-proof" className="mt-2 font-display text-2xl font-semibold text-ak-foam">
          Follow the ecosystem beyond this site
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ak-graphite">
          Verified listings, registries, publications, and trust evidence are cross-referenced in one public catalog.
          Launch Llama, Dev.to, Hashnode, MCP registries, and other independent surfaces link back to the same canonical products.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/resources#directory"
            className="inline-flex min-h-11 items-center rounded-md bg-ak-blue px-4 font-medium text-ak-ink transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
          >
            View verified listings
          </Link>
          <Link
            href="/resources#article"
            className="inline-flex min-h-11 items-center rounded-md border border-ak-border px-4 font-medium text-ak-foam transition hover:border-ak-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
          >
            Read independent publications
          </Link>
        </div>
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
