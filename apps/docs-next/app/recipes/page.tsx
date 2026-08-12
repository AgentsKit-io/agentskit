import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { canonicalUrl } from '@/lib/canonical-url'
import { source } from '@/lib/source'

const DESCRIPTION =
  'Copy-paste TypeScript recipes for AI agents: provider swaps, RAG, memory, tools, MCP, multi-agent workflows, security, and evals.'
const URL = canonicalUrl('/recipes')
const PREFIX = 'reference/recipes'

export const metadata: Metadata = {
  title: 'AI agent recipes for TypeScript',
  description: DESCRIPTION,
  alternates: { canonical: URL },
}

function recipes() {
  return source
    .getPages()
    .filter((page) => page.slugs.length === 3 && page.slugs.slice(0, 2).join('/') === PREFIX)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .map((page) => ({
      href: page.url,
      title: page.data.title,
      description: page.data.description ?? 'A standalone AgentsKit implementation recipe.',
    }))
}

export default function RecipesPage() {
  const entries = recipes()
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${URL}#collection`,
    url: URL,
    name: 'AgentsKit recipes',
    description: DESCRIPTION,
    isPartOf: { '@type': 'WebSite', name: 'AgentsKit.js', url: canonicalUrl('/') },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', url: canonicalUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Recipes', url: canonicalUrl('/recipes') },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'AgentsKit implementation recipes',
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
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <JsonLd data={structuredData} />
      <header className="max-w-3xl">
        <p className="font-mono text-sm text-ak-blue">/recipes</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ak-foam sm:text-5xl">
          AI agent recipes for TypeScript
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ak-graphite">
          Small, end-to-end solutions for the moments that make an agent production-ready. Pick a recipe, copy the
          code, and keep the underlying package contracts visible.
        </p>
        <p className="mt-4 text-sm text-ak-graphite">
          {entries.length} standalone recipes · <Link className="text-ak-foam underline" href="/docs/reference/recipes">
            full reference
          </Link>{' '}
          · <Link className="text-ak-foam underline" href="/docs/use-cases">
            choose a use case
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
              <span className="mt-4 inline-block font-mono text-xs text-ak-blue">Open recipe →</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
