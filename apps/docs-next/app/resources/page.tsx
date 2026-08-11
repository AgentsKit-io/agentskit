import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import {
  PUBLIC_RESOURCE_TYPES,
  publicResources,
  resourcesByType,
  type PublicResourceType,
} from '@/lib/public-resources'
import { canonicalUrl } from '@/lib/canonical-url'

const RESOURCE_LABELS: Record<PublicResourceType, { title: string; description: string }> = {
  official: {
    title: 'Build with the ecosystem',
    description: 'Canonical products, documentation, and developer surfaces maintained by AgentsKit.',
  },
  registry: {
    title: 'Install and discover',
    description: 'Verified registries and marketplaces where AgentsKit tools can be installed or discovered.',
  },
  article: {
    title: 'Read the engineering stories',
    description: 'Technical writing about the design decisions, failures, and tradeoffs behind the ecosystem.',
  },
  directory: {
    title: 'Independent listings',
    description: 'Published third-party profiles that make the project easier to evaluate and find.',
  },
  recognition: {
    title: 'Trust signals',
    description: 'Verified badges and public evidence for security, maintenance, and open-source engineering practices.',
  },
  community: {
    title: 'Contribute',
    description: 'Places that connect contributors with the repositories and work that need help.',
  },
}

export const metadata: Metadata = {
  title: 'Resources — publications, registries, and ecosystem proof',
  description:
    'Explore official AgentsKit tools, MCP registries, technical publications, independent listings, trust signals, and contributor resources.',
  alternates: { canonical: canonicalUrl('/resources') },
  openGraph: {
    type: 'website',
    url: canonicalUrl('/resources'),
    siteName: 'AgentsKit.js',
    title: 'AgentsKit ecosystem resources',
    description:
      'Verified tools, MCP registries, technical publications, independent listings, trust signals, and contributor resources.',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'AgentsKit ecosystem resources' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit ecosystem resources',
    description:
      'Verified tools, MCP registries, technical publications, independent listings, trust signals, and contributor resources.',
    images: ['/api/og'],
  },
}

const resourcesUrl = canonicalUrl('/resources')

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${resourcesUrl}#collection`,
  url: resourcesUrl,
  name: 'AgentsKit ecosystem resources',
  description: metadata.description,
  isPartOf: {
    '@type': 'WebSite',
    name: 'AgentsKit.js',
    url: canonicalUrl('/'),
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: publicResources.length,
    itemListElement: publicResources.map((resource, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': resource.type === 'article' ? 'TechArticle' : 'WebPage',
        name: resource.title,
        description: resource.summary,
        url: resource.url,
        about: resource.product,
        keywords: resource.topics.join(', '),
      },
    })),
  },
}

export default function ResourcesPage() {
  const products = new Set(publicResources.map((resource) => resource.product)).size
  const publishers = new Set(publicResources.map((resource) => resource.publisher)).size

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <JsonLd data={structuredData} />

      <header className="max-w-3xl">
        <p className="font-mono text-sm text-ak-blue">/resources</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ak-foam sm:text-5xl">
          One ecosystem, publicly connected
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ak-graphite">
          Official tools, MCP surfaces, technical writing, independent listings, and public trust evidence.
          Every entry below is live and verified; operational submissions and private campaign data stay private.
        </p>
      </header>

      <section aria-label="Resource summary" className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ak-border bg-ak-border sm:grid-cols-4">
        {[
          { value: publicResources.length, label: 'verified resources' },
          { value: products, label: 'products represented' },
          { value: publishers, label: 'publishers and platforms' },
          { value: PUBLIC_RESOURCE_TYPES.length, label: 'resource types' },
        ].map((item) => (
          <div key={item.label} className="bg-ak-surface p-5">
            <p className="font-display text-3xl font-semibold text-ak-foam">{item.value}</p>
            <p className="mt-1 text-sm text-ak-graphite">{item.label}</p>
          </div>
        ))}
      </section>

      <nav aria-label="Resource sections" className="mt-10 flex flex-wrap gap-2">
        {PUBLIC_RESOURCE_TYPES.map((type) => (
          <a
            key={type}
            href={`#${type}`}
            className="inline-flex min-h-11 items-center rounded-full border border-ak-border px-4 font-mono text-xs uppercase tracking-wide text-ak-graphite transition hover:border-ak-blue hover:text-ak-foam focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
          >
            {RESOURCE_LABELS[type].title}
          </a>
        ))}
      </nav>

      <div className="mt-16 space-y-20">
        {PUBLIC_RESOURCE_TYPES.map((type) => {
          const resources = resourcesByType(type)
          const label = RESOURCE_LABELS[type]

          return (
            <section key={type} id={type} aria-labelledby={`${type}-title`} className="scroll-mt-24">
              <div className="max-w-2xl">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">{type}</p>
                <h2 id={`${type}-title`} className="mt-2 font-display text-3xl font-semibold tracking-tight text-ak-foam">
                  {label.title}
                </h2>
                <p className="mt-3 leading-relaxed text-ak-graphite">{label.description}</p>
              </div>

              <ul className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
                {resources.map((resource) => (
                  <li key={resource.id}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener"
                      className="group flex h-full min-h-44 flex-col rounded-lg border border-ak-border bg-ak-surface p-5 transition hover:-translate-y-0.5 hover:border-ak-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue motion-reduce:hover:translate-y-0"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ak-graphite">
                        <span>{resource.product}</span>
                        <span aria-hidden="true">·</span>
                        <span>{resource.publisher}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={resource.verifiedAt}>verified {resource.verifiedAt}</time>
                      </div>
                      <h3 className="mt-3 font-display text-xl font-semibold text-ak-foam group-hover:text-ak-blue">
                        {resource.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ak-graphite">{resource.summary}</p>
                      <ul aria-label="Topics" className="mt-4 flex flex-wrap gap-2">
                        {resource.topics.map((topic) => (
                          <li key={topic} className="rounded-full border border-ak-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ak-graphite">
                            {topic}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 font-mono text-xs text-ak-blue">Open resource ↗</p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <footer className="mt-20 rounded-lg border border-ak-blue/40 bg-ak-surface p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">Keep the graph useful</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ak-foam">Found a missing or stale resource?</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ak-graphite">
          Suggestions, corrections, critical feedback, contributions, and stars all help the open-source ecosystem mature.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="https://github.com/AgentsKit-io/agentskit/issues/new"
            className="inline-flex min-h-11 items-center rounded-md bg-ak-blue px-4 font-medium text-ak-ink transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
          >
            Suggest a resource
          </Link>
          <Link
            href="/ecosystem"
            className="inline-flex min-h-11 items-center rounded-md border border-ak-border px-4 font-medium text-ak-foam transition hover:border-ak-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
          >
            Explore the ecosystem
          </Link>
        </div>
      </footer>
    </main>
  )
}
