import { readFile } from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { Tabs, Tab } from 'fumadocs-ui/components/tabs'
import { SHOWCASE, findShowcase, type ShowcaseFramework } from '@/lib/showcase'
import { LiveExample } from '@/components/showcase/live'
import { ShowcaseFrameworkTabs } from '@/components/showcase/framework-tabs'

const SHARED_FILES: { label: string; path: string }[] = [
  { label: '_shared/mock-adapter.ts', path: 'components/examples/_shared/mock-adapter.ts' },
  { label: '_shared/tool-badge.tsx', path: 'components/examples/_shared/tool-badge.tsx' },
  { label: '_shared/md-renderer.tsx', path: 'components/examples/_shared/md-renderer.tsx' },
]

async function readSource(module: string): Promise<string | null> {
  try {
    const file = path.join(process.cwd(), 'components', 'examples', `${module}.tsx`)
    return await readFile(file, 'utf8')
  } catch {
    return null
  }
}

async function readSharedSources(source: string): Promise<{ label: string; code: string }[]> {
  const included = SHARED_FILES.filter((f) =>
    source.includes(f.label.replace(/\.tsx?$/, '')),
  )
  const entries = await Promise.all(
    included.map(async (f) => {
      try {
        const code = await readFile(path.join(process.cwd(), f.path), 'utf8')
        return { label: f.label, code }
      } catch {
        return null
      }
    }),
  )
  return entries.filter((e): e is { label: string; code: string } => e !== null)
}

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
  const source = await readSource(entry.module)
  const shared = source ? await readSharedSources(source) : []
  const altFrameworks = Object.keys(entry.sources ?? {}) as Exclude<ShowcaseFramework, 'react'>[]
  const altSourceEntries = await Promise.all(
    altFrameworks.map(async (fw) => {
      const file = entry.sources?.[fw]?.file
      if (!file) return [fw, null] as const
      try {
        return [fw, await readFile(path.join(process.cwd(), file), 'utf8')] as const
      } catch {
        return [fw, null] as const
      }
    }),
  )
  const altSources = Object.fromEntries(altSourceEntries) as Partial<
    Record<Exclude<ShowcaseFramework, 'react'>, string | null>
  >
  const tabs: { label: string; code: string; lang: string }[] = source
    ? [
        { label: `${entry.module}.tsx`, code: source, lang: 'tsx' },
        ...shared.map((s) => ({ label: s.label, code: s.code, lang: 'ts' })),
      ]
    : []

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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ak-foam">{entry.name}</h1>
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

      <section className="mb-8">
        <header className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          Live preview
        </header>
        <div className="rounded-lg border border-ak-border bg-ak-surface p-4">
          <LiveExample meta={entry} />
        </div>
      </section>

      {tabs.length > 0 ? (
        <section id="react-source" className="mb-12">
          <header className="mb-2 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
              Source
            </div>
          </header>
          <ShowcaseFrameworkTabs
            meta={entry}
            reactSource={source}
            altSources={altSources}
            reactTabs={
              <Tabs items={tabs.map((t) => t.label)}>
                {tabs.map((t) => (
                  <Tab key={t.label} value={t.label}>
                    <DynamicCodeBlock lang={t.lang} code={t.code} />
                  </Tab>
                ))}
              </Tabs>
            }
          />
        </section>
      ) : null}

      <section className="mt-12 border-t border-ak-border pt-8">
        <header className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
            More examples
          </div>
          <Link
            href="/showcase"
            className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
          >
            See all →
          </Link>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE.filter((s) => s.slug !== entry.slug).map((s) => (
            <li key={s.slug}>
              <Link
                href={`/showcase/${s.slug}`}
                className="group block h-full rounded-lg border border-ak-border bg-ak-surface p-4 transition hover:border-ak-foam"
              >
                <h3 className="font-display text-sm font-semibold text-ak-foam group-hover:text-ak-foam">
                  {s.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-ak-graphite">{s.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ak-border px-2 py-0.5 font-mono text-[9px] text-ak-graphite"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
