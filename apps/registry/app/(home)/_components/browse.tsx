'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import type { RegistryAgentSummary } from '@/lib/registry'
import { catalogUrl, filterAndSortAgents } from '@/lib/catalog'
import type { CatalogSort } from '@/lib/catalog'
import { queryLengthBucket } from '@/lib/analytics'
import { trackRegistryEvent } from '@/lib/posthog-client'
import { Icon, CopyButton } from './ui'
import { categoryMeta, sortedCategories } from './categories'

const PAGE_SIZE = 24

function AgentCard({ agent }: { agent: RegistryAgentSummary }) {
  const category = categoryMeta(agent.category)
  return (
    <article className="group flex min-h-60 min-w-0 max-w-full flex-col overflow-hidden border-t border-ak-border py-5 transition hover:border-ak-blue">
      <Link
        href={`/agents/${agent.id}`}
        className="min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ak-blue"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ak-graphite">
          <Icon name={category.icon} size={15} />
          <span>{category.label}</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-ak-foam group-hover:text-ak-blue">{agent.title}</h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-ak-graphite">{agent.description}</p>
      </Link>
      <div className="mt-5 flex items-center gap-2 border-t border-ak-border pt-3">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-ak-graphite">npx @agentskit/cli add {agent.id}</code>
        <CopyButton value={`npx @agentskit/cli add ${agent.id}`} variant="icon" analytics={{ agentId: agent.id, surface: 'catalog' }} />
      </div>
    </article>
  )
}

export function Browse({
  agents,
  basePath = '/',
}: {
  agents: RegistryAgentSummary[]
  basePath?: '/' | '/agents'
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categories = useMemo(() => sortedCategories(agents.map((agent) => agent.category)), [agents])
  const query = searchParams.get('q')?.trim() ?? ''
  const category = searchParams.get('category') ?? ''
  const requestedSort = searchParams.get('sort')
  const sort: CatalogSort = requestedSort === 'score' || requestedSort === 'name' ? requestedSort : 'recommended'
  const requestedPage = Number(searchParams.get('page') ?? '1')
  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const agent of agents) result[agent.category] = (result[agent.category] ?? 0) + 1
    return result
  }, [agents])

  const filtered = useMemo(() => {
    return filterAndSortAgents(agents, { query, category, reviewed: false, runnable: false, sort })
  }, [agents, category, query, sort])
  const searchResultCount = useMemo(() => {
    return filterAndSortAgents(agents, {
      query,
      category: '',
      reviewed: false,
      runnable: false,
      sort: 'recommended',
    }).length
  }, [agents, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (!query) return
    const timer = window.setTimeout(() => {
      trackRegistryEvent('registry_catalog_search_used', {
        query_length: queryLengthBucket(query.length),
        result_count: searchResultCount,
      })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [query, searchResultCount])
  function update(next: { q?: string; category?: string; sort?: CatalogSort; page?: number }) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      const serialized = Array.isArray(value) ? value.join(',') : String(value ?? '')
      if (!value || value === 1 || value === 'recommended' || (Array.isArray(value) && value.length === 0)) params.delete(key)
      else params.set(key, serialized)
    }
    router.replace(catalogUrl(basePath, params), { scroll: false })
  }

  const hasFilters = Boolean(query || category || sort !== 'recommended')

  return (
    <section id="agents" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_1fr] lg:gap-10">
          <aside aria-label="Agent categories" className="min-w-0 max-w-full overflow-hidden lg:sticky lg:top-20 lg:self-start lg:overflow-visible">
            <h2 className="text-xl font-semibold text-ak-foam">Explore agents</h2>
            <p className="mt-1 text-sm text-ak-graphite">Find the right agent for the task.</p>
            <nav className="mt-5 flex w-full min-w-0 gap-2 overflow-x-auto pb-2 lg:block lg:space-y-0.5 lg:overflow-visible">
              <button
                type="button"
                onClick={() => {
                  trackRegistryEvent('registry_catalog_filter_changed', { filter: 'category', value: 'all' })
                  update({ category: '', page: 1 })
                }}
                aria-current={!category ? 'page' : undefined}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm lg:w-full ${!category ? 'bg-ak-surface font-medium text-ak-foam' : 'text-ak-graphite hover:text-ak-foam'}`}
              >
                <Icon name="layers" size={16} /> All <span className="ml-auto font-mono text-[11px]">{agents.length}</span>
              </button>
              {categories.map((id) => {
                const meta = categoryMeta(id)
                const active = id === category
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      trackRegistryEvent('registry_catalog_filter_changed', { filter: 'category', value: id })
                      update({ category: id, page: 1 })
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm lg:w-full ${active ? 'bg-ak-surface font-medium text-ak-foam' : 'text-ak-graphite hover:text-ak-foam'}`}
                  >
                    <Icon name={meta.icon} size={16} /> {meta.label}
                    <span className="ml-auto font-mono text-[11px]">{counts[id]}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="min-w-0">
            <label className="relative block">
              <span className="sr-only">Search agents</span>
              <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ak-graphite" />
              <input
                type="search"
                value={query}
                onChange={(event) => update({ q: event.target.value, page: 1 })}
                placeholder="Search by task, agent, or capability"
                className="h-11 w-full rounded-md border border-ak-border bg-ak-midnight pr-4 pl-11 text-sm text-ak-foam outline-none transition placeholder:text-ak-graphite focus:border-ak-blue focus:ring-2 focus:ring-ak-blue/20"
              />
            </label>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-ak-border pb-3 text-sm">
              <p className="text-ak-graphite"><strong className="font-medium text-ak-foam">{filtered.length}</strong> {filtered.length === 1 ? 'agent' : 'agents'}</p>
              <label className="ml-auto flex items-center gap-2 text-ak-graphite">
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={(event) => {
                    const nextSort = event.target.value as CatalogSort
                    trackRegistryEvent('registry_catalog_filter_changed', { filter: 'sort', value: nextSort })
                    update({ sort: nextSort, page: 1 })
                  }}
                  className="h-11 rounded-md border border-ak-border bg-ak-midnight px-2 text-sm text-ak-foam outline-none focus:border-ak-blue"
                >
                  <option value="recommended">Recommended</option>
                  <option value="score">Review score</option>
                  <option value="name">Name</option>
                </select>
              </label>
              {hasFilters && (
                <button type="button" onClick={() => {
                  trackRegistryEvent('registry_catalog_filter_changed', { filter: 'clear', value: true })
                  update({ q: '', category: '', sort: 'recommended', page: 1 })
                }} className="min-h-11 px-1 text-ak-blue hover:underline">Clear filters</button>
              )}
            </div>

            {visible.length > 0 ? (
              <div className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : (
              <div className="border-b border-ak-border py-16 text-center">
                <h3 className="font-semibold text-ak-foam">No matching agents</h3>
                <p className="mt-2 text-sm text-ak-graphite">Try a broader task or clear the selected category.</p>
              </div>
            )}

            {pageCount > 1 && (
              <nav aria-label="Agent result pages" className="mt-8 flex items-center justify-between border-t border-ak-border pt-5">
                <button type="button" disabled={page === 1} onClick={() => update({ page: page - 1 })} className="text-sm text-ak-blue disabled:pointer-events-none disabled:text-ak-graphite">Previous</button>
                <span className="text-sm text-ak-graphite">Page {page} of {pageCount}</span>
                <button type="button" disabled={page === pageCount} onClick={() => update({ page: page + 1 })} className="text-sm text-ak-blue disabled:pointer-events-none disabled:text-ak-graphite">Next</button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
