'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { RegistryAgentSummary } from '@/lib/registry'

export function Gallery({ agents }: { agents: RegistryAgentSummary[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(agents.map((a) => a.category))).sort()],
    [agents],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return agents.filter((a) => {
      if (category !== 'all' && a.category !== category) return false
      if (!q) return true
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [agents, query, category])

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents…"
          aria-label="Search agents"
          className="w-full rounded-lg border border-ak-border bg-ak-surface/40 px-3 py-2 text-sm text-ak-foam outline-none placeholder:text-ak-graphite focus:border-ak-blue sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] transition ${
                category === c
                  ? 'border-ak-blue bg-ak-blue/10 text-ak-foam'
                  : 'border-ak-border text-ak-graphite hover:text-ak-foam'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 font-mono text-xs text-ak-graphite">
        {filtered.length} of {agents.length} agents
      </p>

      {filtered.length === 0 ? (
        <p className="text-ak-graphite">No agents match.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.id}
              href={`/agents/${a.id}`}
              className="flex flex-col gap-2 rounded-xl border border-ak-border bg-ak-surface/40 p-4 transition hover:border-ak-foam/40"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ak-blue">{a.category}</span>
              <span className="font-medium text-ak-foam">{a.title}</span>
              <span className="line-clamp-3 text-sm text-ak-graphite">{a.description}</span>
              <span className="mt-auto font-mono text-[11px] text-ak-blue">npx agentskit add {a.id}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
