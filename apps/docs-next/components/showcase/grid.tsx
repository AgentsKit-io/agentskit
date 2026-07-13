'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ALL_TAGS, SHOWCASE, type ShowcaseMeta } from '@/lib/showcase'

export function ShowcaseGrid() {
  const [active, setActive] = useState<string | null>(null)
  const filtered = useMemo(
    () => (active ? SHOWCASE.filter((s) => s.tags.includes(active)) : SHOWCASE),
    [active],
  )

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActive(null)}
          className={`min-h-11 rounded-full border px-4 py-2 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue ${
            active === null
              ? 'border-ak-foam bg-ak-foam/15 text-ak-foam'
              : 'border-ak-border text-ak-graphite hover:text-ak-foam'
          }`}
        >
          All
        </button>
        {ALL_TAGS.map((tag) => {
          const on = active === tag
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setActive(on ? null : tag)}
              className={`min-h-11 rounded-full border px-4 py-2 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue ${
                on
                  ? 'border-ak-foam bg-ak-foam/15 text-ak-foam'
                  : 'border-ak-border text-ak-graphite hover:text-ak-foam'
              }`}
            >
              {tag}
            </button>
          )
        })}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/showcase/${s.slug}`}
              className="group block h-full overflow-hidden rounded-lg border border-ak-border bg-ak-surface transition hover:border-ak-foam focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue motion-reduce:transition-none"
            >
              <div
                aria-hidden="true"
                className="relative aspect-video w-full overflow-hidden bg-ak-midnight p-5"
              >
                <ShowcasePreview meta={s} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ak-midnight/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="border-t border-ak-border p-4">
                <h2 className="font-display text-base font-semibold text-ak-foam">{s.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-ak-graphite">{s.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ak-border px-2 py-0.5 font-mono text-xs text-ak-graphite"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function ShowcasePreview({ meta }: { meta: ShowcaseMeta }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-md border border-ak-border bg-ak-surface shadow-2xl transition duration-300 group-hover:-translate-y-0.5 group-hover:border-ak-blue/60 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex items-center gap-1.5 border-b border-ak-border px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-ak-red/80" />
        <span className="h-2 w-2 rounded-full bg-ak-blue/80" />
        <span className="h-2 w-2 rounded-full bg-ak-green/80" />
        <span className="ml-auto font-mono text-xs uppercase tracking-widest text-ak-graphite">live</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 px-4">
        <div className="h-2 w-2/3 rounded-full bg-ak-blue/30" />
        <div className="ml-auto h-2 w-1/2 rounded-full bg-ak-green/30" />
        <div className="h-2 w-3/4 rounded-full bg-ak-red/30" />
      </div>
      <div className="flex items-center justify-between border-t border-ak-border px-3 py-2 font-mono text-xs text-ak-graphite">
        <span>{meta.module}</span>
        <span className="text-ak-blue">open →</span>
      </div>
    </div>
  )
}
