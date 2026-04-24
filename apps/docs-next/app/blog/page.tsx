import Link from 'next/link'
import { allBlogPosts, slugOf } from '@/lib/blog'

export const metadata = {
  title: 'Blog — AgentsKit.js',
  description: 'Releases, design notes, and deep dives from the AgentsKit.js team.',
  alternates: {
    canonical: 'https://www.agentskit.io/blog',
    types: {
      'application/rss+xml': '/blog/rss.xml',
      'application/feed+json': '/blog/feed.json',
    },
  },
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogIndex() {
  const posts = allBlogPosts()
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-10">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Blog</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Releases, decisions, and deep dives</h1>
        <p className="mt-3 text-ak-graphite">
          Long-form posts from the AgentsKit.js team. Subscribe via{' '}
          <a href="/blog/rss.xml" className="text-ak-foam underline">
            RSS
          </a>{' '}
          or{' '}
          <a href="/blog/feed.json" className="text-ak-foam underline">
            JSON Feed
          </a>
          .
        </p>
      </div>

      <ul className="flex flex-col gap-5">
        {posts.map((p) => {
          const slug = slugOf(p)
          return (
            <li key={slug}>
              <Link
                href={`/blog/${slug}`}
                className="group block rounded-lg border border-ak-border bg-ak-surface p-5 transition hover:border-ak-foam"
              >
                <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                  <span>{fmtDate(p.date)}</span>
                  <span>·</span>
                  <span>{p.author}</span>
                  {p.tags.length ? (
                    <>
                      <span>·</span>
                      <span>{p.tags.join(' / ')}</span>
                    </>
                  ) : null}
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold text-white group-hover:text-ak-foam">
                  {p.title}
                </h2>
                {p.description ? (
                  <p className="mt-2 text-ak-graphite">{p.description}</p>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
