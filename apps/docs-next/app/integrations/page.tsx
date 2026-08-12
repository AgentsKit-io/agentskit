import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { canonicalUrl } from '@/lib/canonical-url'
import { lists } from '@/lib/ecosystem-stats'
import { source } from '@/lib/source'

const DESCRIPTION =
  '50-service integration catalog for TypeScript AI agents: GitHub, Slack, Stripe, Postgres, Gmail, Notion, and more with one tool contract.'
const URL = canonicalUrl('/integrations')
const PREFIX = 'agents/tools/integrations'

export const metadata: Metadata = {
  title: 'AI agent integrations for TypeScript',
  description: DESCRIPTION,
  alternates: { canonical: URL },
}

function integrations() {
  return source
    .getPages()
    .filter((page) => page.slugs.length === 4 && page.slugs.slice(0, 3).join('/') === PREFIX)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .map((page) => ({
      href: page.url,
      slug: page.slugs[3],
      title: page.data.title,
      description: page.data.description ?? 'A verified AgentsKit tool integration.',
    }))
}

export default function IntegrationsPage() {
  const entries = integrations()
  const guidesBySlug = new Map(entries.map((entry) => [entry.slug, entry]))
  const catalog = lists.integrations.map((slug) => ({ slug, guide: guidesBySlug.get(slug) }))
  const catalogGuideCount = catalog.filter((entry) => entry.guide).length
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${URL}#collection`,
    url: URL,
    name: 'AgentsKit integrations',
    description: DESCRIPTION,
    isPartOf: { '@type': 'WebSite', name: 'AgentsKit.js', url: canonicalUrl('/') },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', url: canonicalUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Integrations', url: canonicalUrl('/integrations') },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'AgentsKit documented integration guides',
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'TechArticle',
          name: entry.title,
          description: entry.description,
          url: canonicalUrl(entry.href),
        },
      })),
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'catalogServiceCount',
        value: catalog.length,
      },
      {
        '@type': 'PropertyValue',
        name: 'documentedGuideCount',
        value: catalogGuideCount,
      },
    ],
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <JsonLd data={structuredData} />
      <header className="max-w-3xl">
        <p className="font-mono text-sm text-ak-blue">/integrations</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ak-foam sm:text-5xl">
          AI agent integrations for TypeScript
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ak-graphite">
          Connect an agent to the services it already uses. Each integration follows the same install, config, and
          execute contract, with the implementation details kept on its canonical documentation page.
        </p>
        <p className="mt-4 text-sm text-ak-graphite">
          {catalog.length} catalog services · {catalogGuideCount} dedicated guides ·{' '}
          <Link className="text-ak-foam underline" href="/docs/for-agents/integrations">
            integration package contract
          </Link>{' '}
          · <Link className="text-ak-foam underline" href="/docs/agents/tools">
            tool contract
          </Link>{' '}
          · <Link className="text-ak-foam underline" href="/docs/agents/tools/authoring">
            author your own
          </Link>
        </p>
      </header>

      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="group block h-full rounded-lg border border-ak-border bg-ak-surface p-5 transition hover:border-ak-blue"
            >
              <h2 className="font-display text-xl font-semibold text-ak-foam group-hover:text-ak-foam">
                {entry.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ak-graphite">{entry.description}</p>
              <span className="mt-4 inline-block font-mono text-xs text-ak-blue">Read integration →</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="catalog-title" className="mt-14">
        <h2 id="catalog-title" className="font-mono text-sm uppercase tracking-wider text-ak-graphite">
          Canonical service catalog
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ak-graphite">
          The count below is generated from <code className="text-ak-foam">@agentskit/integrations</code>. A linked
          name has a dedicated guide on this site; an unlinked name is a catalog descriptor covered by the package
          contract above, not an invented documentation page.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {catalog.map(({ slug, guide }) => (
            <li key={slug} className="rounded border border-ak-border bg-ak-surface px-3 py-2 text-sm">
              {guide ? (
                <Link href={guide.href} className="text-ak-foam underline decoration-ak-blue underline-offset-4">
                  {slug}
                </Link>
              ) : (
                <code className="text-ak-graphite">{slug}</code>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
