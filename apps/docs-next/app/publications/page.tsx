import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { allBlogPosts, slugOf } from '@/lib/blog'
import { canonicalUrl } from '@/lib/canonical-url'

const DESCRIPTION =
  'Canonical AgentsKit technical publications: releases, design decisions, and engineering deep dives from the team.'
const URL = canonicalUrl('/publications')

export const metadata: Metadata = {
  title: 'AgentsKit technical publications',
  description: DESCRIPTION,
  alternates: { canonical: URL },
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PublicationsPage() {
  const posts = allBlogPosts()
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${URL}#collection`,
    url: URL,
    name: 'AgentsKit technical publications',
    description: DESCRIPTION,
    isPartOf: { '@type': 'WebSite', name: 'AgentsKit.js', url: canonicalUrl('/') },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', url: canonicalUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Publications', url: canonicalUrl('/publications') },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'AgentsKit publications',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'TechArticle',
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          author: { '@type': 'Person', name: post.author },
          url: canonicalUrl(`/blog/${slugOf(post)}`),
        },
      })),
    },
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <JsonLd data={structuredData} />
      <header>
        <p className="font-mono text-sm text-ak-blue">/publications</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ak-foam sm:text-5xl">
          Technical publications
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ak-graphite">{DESCRIPTION}</p>
        <p className="mt-4 text-sm leading-relaxed text-ak-graphite">
          First-party writing lives here. For independently published profiles, registries, and trust evidence, use{' '}
          <Link className="text-ak-foam underline" href="/resources#article">
            the verified resources index
          </Link>
          .
        </p>
      </header>

      <ul className="mt-12 flex flex-col gap-5">
        {posts.map((post) => {
          const slug = slugOf(post)
          return (
            <li key={slug}>
              <Link
                href={`/blog/${slug}`}
                className="group block rounded-lg border border-ak-border bg-ak-surface p-5 transition hover:border-ak-blue"
              >
                <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                  <span>{formatDate(post.date)}</span>
                  <span>·</span>
                  <span>{post.author}</span>
                  {post.tags.length ? (
                    <>
                      <span>·</span>
                      <span>{post.tags.join(' / ')}</span>
                    </>
                  ) : null}
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold text-ak-foam">{post.title}</h2>
                {post.description ? <p className="mt-2 text-ak-graphite">{post.description}</p> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
