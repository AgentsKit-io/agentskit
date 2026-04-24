import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHOWCASE, findShowcase } from '@/lib/showcase'
import { LiveExample } from '@/components/showcase/live'

export function generateStaticParams() {
  return SHOWCASE.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = findShowcase(slug)
  if (!entry) return { title: 'Showcase' }
  return { title: `${entry.name} — AgentsKit showcase`, description: entry.description }
}

export default async function ShowcaseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = findShowcase(slug)
  if (!entry) notFound()

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <Link
        href="/showcase"
        className="mb-6 inline-block font-mono text-xs uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
      >
        ← All examples
      </Link>
      <div className="mb-6">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Showcase</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{entry.name}</h1>
        <p className="mt-2 text-ak-graphite">{entry.description}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-ak-border px-2 py-0.5 font-mono text-[10px] text-ak-graphite"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-ak-border bg-ak-surface p-4">
        <LiveExample meta={entry} />
      </div>
    </main>
  )
}
