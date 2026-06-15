import Link from 'next/link'
import { notFound } from 'next/navigation'
import { allBlogPosts, findBlogPost, slugOf, slugsOfAll } from '@/lib/blog'
import { getMDXComponents } from '@/mdx-components'

export function generateStaticParams() {
  return slugsOfAll().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = findBlogPost(slug)
  if (!post) return { title: 'Blog' }
  return {
    title: `${post.title} — AgentsKit.js blog`,
    description: post.description,
    alternates: { canonical: `https://www.agentskit.io/blog/${slug}` },
    openGraph: { type: 'article', title: post.title, description: post.description },
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = findBlogPost(slug)
  if (!post) notFound()

  const MDX = post.body
  const all = allBlogPosts()
  const idx = all.findIndex((p) => slugOf(p) === slug)
  const prev = idx >= 0 ? all[idx + 1] : undefined
  const next = idx > 0 ? all[idx - 1] : undefined

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link href="/blog" className="mb-6 inline-block font-mono text-xs uppercase tracking-widest text-ak-graphite hover:text-ak-foam">
        ← All posts
      </Link>
      <header className="mb-8 border-b border-ak-border pb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          {new Date(post.date + 'T00:00:00Z').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          · {post.author}
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ak-foam">{post.title}</h1>
        {post.description ? <p className="mt-3 text-lg text-ak-graphite">{post.description}</p> : null}
      </header>

      <article className="prose prose-invert max-w-none">
        <MDX components={getMDXComponents()} />
      </article>

      <aside className="mt-12 rounded-xl border border-ak-border bg-ak-surface/50 p-6">
        <h2 className="font-display text-lg font-semibold text-ak-foam">Build with the community</h2>
        <p className="mt-1 text-sm text-ak-graphite">
          AgentsKit is open source. Read the docs, follow the Playbook, and join the people shipping production agents.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <a
            href="https://www.agentskit.io/docs"
            className="rounded-md border border-ak-border px-3 py-1.5 text-ak-foam hover:border-ak-blue hover:text-ak-blue"
          >
            Read the docs
          </a>
          <a
            href="https://playbook.agentskit.io"
            className="rounded-md border border-ak-border px-3 py-1.5 text-ak-foam hover:border-ak-blue hover:text-ak-blue"
          >
            Playbook
          </a>
          <a
            href="https://github.com/AgentsKit-io/agentskit"
            target="_blank"
            rel="noopener"
            className="rounded-md border border-ak-border px-3 py-1.5 text-ak-foam hover:border-ak-blue hover:text-ak-blue"
          >
            Star on GitHub
          </a>
          <a
            href="https://discord.gg/zx6z2p4jVb"
            target="_blank"
            rel="noopener"
            className="rounded-md border border-ak-border px-3 py-1.5 text-ak-foam hover:border-ak-blue hover:text-ak-blue"
          >
            Discord
          </a>
        </div>
      </aside>

      <footer className="mt-12 grid gap-3 border-t border-ak-border pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={`/blog/${slugOf(prev)}`} className="rounded-lg border border-ak-border bg-ak-surface p-4 hover:border-ak-foam">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">← Older</div>
            <div className="mt-1 font-display text-base font-semibold text-ak-foam">{prev.title}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/blog/${slugOf(next)}`} className="rounded-lg border border-ak-border bg-ak-surface p-4 text-right hover:border-ak-foam">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">Newer →</div>
            <div className="mt-1 font-display text-base font-semibold text-ak-foam">{next.title}</div>
          </Link>
        ) : <span />}
      </footer>
    </main>
  )
}
