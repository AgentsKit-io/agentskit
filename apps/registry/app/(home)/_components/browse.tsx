'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { RegistryAgentSummary } from '@/lib/registry'
import { Icon, CopyButton } from './ui'
import { categoryMeta, sortedCategories } from './categories'

function AgentCard({ a }: { a: RegistryAgentSummary }) {
  const cat = categoryMeta(a.category)
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-ak-border bg-ak-surface transition hover:-translate-y-0.5 hover:border-ak-blue/50 hover:shadow-lg">
      <Link href={`/agents/${a.id}`} className="flex-1 p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full border border-ak-blue/30 bg-ak-blue/10 px-2.5 py-0.5 text-[11px] font-medium text-ak-blue">{cat.label}</span>
          {a.runnable && (
            <span className="inline-flex items-center gap-1 rounded-full border border-ak-green/40 px-2.5 py-0.5 text-[11px] font-medium text-ak-green">
              <span className="h-1.5 w-1.5 rounded-full bg-ak-green" /> Runnable
            </span>
          )}
        </div>
        <div className="mb-2 flex items-center gap-2.5">
          <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ak-blue/25 bg-ak-blue/10 text-ak-blue">
            <Icon name="bot" size={18} />
          </span>
          <h3 className="text-[1.05rem] font-semibold text-ak-foam">{a.title}</h3>
        </div>
        <p className="line-clamp-3 text-sm text-ak-graphite">{a.description}</p>
      </Link>
      <div className="flex items-center gap-2 border-t border-ak-border bg-ak-midnight/40 px-4 py-2.5">
        <code className="flex-1 truncate font-mono text-xs text-ak-graphite">npx agentskit add {a.id}</code>
        <CopyButton value={`npx agentskit add ${a.id}`} variant="icon" />
      </div>
    </article>
  )
}

export function Browse({ agents }: { agents: RegistryAgentSummary[] }) {
  const cats = useMemo(() => sortedCategories(agents.map((a) => a.category)), [agents])
  const [active, setActive] = useState(cats[0] ?? '')
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of agents) m[a.category] = (m[a.category] ?? 0) + 1
    return m
  }, [agents])
  const filtered = agents.filter((a) => a.category === active)

  return (
    <section id="agents" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">Browse by category</div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ak-foam sm:text-3xl">Browse by category</h2>
        <p className="mt-2 max-w-xl text-ak-graphite">Pick a category to filter the agents below.</p>

        <div role="tablist" aria-label="Filter agents by category" className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((id) => {
            const m = categoryMeta(id)
            const on = id === active
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(id)}
                className={`relative flex items-start gap-3.5 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                  on ? 'border-ak-blue/60 bg-ak-blue/5' : 'border-ak-border bg-ak-surface hover:border-ak-blue/40'
                }`}
              >
                <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ak-blue/20 bg-ak-blue/10 text-ak-blue">
                  <Icon name={m.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-ak-foam">{m.label}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ak-graphite">{counts[id]} agents</span>
                  </span>
                  <span className="mt-1 block text-sm text-ak-graphite">{m.blurb}</span>
                </span>
                {on && (
                  <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-ak-blue text-white">
                    <Icon name="check" size={13} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => <AgentCard key={a.id} a={a} />)}
        </div>
      </div>
    </section>
  )
}
