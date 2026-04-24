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
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white">{post.title}</h1>
        {post.description ? <p className="mt-3 text-lg text-ak-graphite">{post.description}</p> : null}
      </header>

      <article className="prose prose-invert max-w-none">
        <MDX components={getMDXComponents()} />
      </article>

      <footer className="mt-12 grid gap-3 border-t border-ak-border pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={`/blog/${slugOf(prev)}`} className="rounded-lg border border-ak-border bg-ak-surface p-4 hover:border-ak-foam">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">← Older</div>
            <div className="mt-1 font-display text-base font-semibold text-white">{prev.title}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/blog/${slugOf(next)}`} className="rounded-lg border border-ak-border bg-ak-surface p-4 text-right hover:border-ak-foam">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">Newer →</div>
            <div className="mt-1 font-display text-base font-semibold text-white">{next.title}</div>
          </Link>
        ) : <span />}
      </footer>
    </main>
  )
}
