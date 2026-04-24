'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ALL_TAGS, SHOWCASE } from '@/lib/showcase'
import { LiveExample } from './live'

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
          className={`rounded-full border px-3 py-1 font-mono text-xs ${
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
              className={`rounded-full border px-3 py-1 font-mono text-xs ${
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
              className="group block h-full overflow-hidden rounded-lg border border-ak-border bg-ak-surface transition hover:border-ak-foam"
            >
              <div
                aria-hidden="true"
                className="relative aspect-video w-full overflow-hidden bg-ak-midnight"
              >
                <div
                  className="pointer-events-none absolute left-0 top-0 origin-top-left"
                  style={{ width: '142.857%', height: '142.857%', transform: 'scale(0.7)' }}
                >
                  <LiveExample meta={s} />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ak-midnight/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="border-t border-ak-border p-4">
                <h3 className="font-display text-base font-semibold text-ak-foam">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-ak-graphite">{s.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ak-border px-2 py-0.5 font-mono text-[10px] text-ak-graphite"
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
