import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  agentsInCategory,
  categoryIds,
  categoryJsonLd,
  categoryMeta,
  categoryMetadata,
} from '@/lib/categories'
import { getRegistryIndex } from '@/lib/registry'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const agents = await getRegistryIndex()
  return categoryIds(agents).map((category) => ({ category }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const agents = await getRegistryIndex()
  return categoryMetadata(category, agents) ?? {
    title: 'Category not found',
    description: 'This registry category does not exist.',
    robots: { index: false, follow: false },
  }
}

function agentStatus(reviewed: boolean, runnable: boolean): string {
  if (reviewed && runnable) return 'Reviewed and runnable'
  if (reviewed) return 'Independently reviewed'
  if (runnable) return 'Runnable'
  return 'Registry listed'
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const index = await getRegistryIndex()
  const agents = agentsInCategory(index, category)
  if (agents.length === 0) notFound()

  const { label, blurb } = categoryMeta(category)
  const reviewed = agents.filter((agent) => Boolean(agent.validation)).length
  const runnable = agents.filter((agent) => Boolean(agent.runnable)).length
  const jsonLd = categoryJsonLd(category, agents)

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ak-graphite">
        <Link href="/#agents" className="hover:text-ak-blue">Agents</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ak-foam">{label}</span>
      </nav>

      <header className="mt-8 border-b border-ak-border pb-9">
        <p className="font-mono text-xs uppercase text-ak-blue">Registry category</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ak-foam sm:text-4xl">{label} AI agents</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-ak-graphite sm:text-lg">{blurb}</p>

        <dl className="mt-7 grid grid-cols-3 divide-x divide-ak-border border-y border-ak-border py-4">
          <div className="pr-3">
            <dt className="text-xs text-ak-graphite">Agents</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-ak-foam">{agents.length}</dd>
          </div>
          <div className="px-3 sm:px-5">
            <dt className="text-xs text-ak-graphite">Reviewed</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-ak-foam">{reviewed}</dd>
          </div>
          <div className="pl-3 sm:pl-5">
            <dt className="text-xs text-ak-graphite">Runnable</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-ak-foam">{runnable}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="category-agents" className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="category-agents" className="text-xl font-semibold text-ak-foam">All {label} agents</h2>
          <Link href={`/?category=${encodeURIComponent(category)}#agents`} className="text-sm text-ak-blue hover:underline">
            Filter in catalog
          </Link>
        </div>

        <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
          {agents.map((agent) => {
            const status = agentStatus(Boolean(agent.validation), Boolean(agent.runnable))
            return (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group min-w-0 border-t border-ak-border py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ak-blue"
              >
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <h3 className="min-w-0 font-medium text-ak-foam group-hover:text-ak-blue">{agent.title}</h3>
                  <span className="shrink-0 font-mono text-[11px] text-ak-graphite">{agent.version ? `v${agent.version}` : 'v1'}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ak-graphite">{agent.description}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-ak-graphite">
                  <span aria-hidden="true" className={agent.validation ? 'size-1.5 rounded-full bg-ak-green' : 'size-1.5 rounded-full bg-ak-border'} />
                  {status}
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
