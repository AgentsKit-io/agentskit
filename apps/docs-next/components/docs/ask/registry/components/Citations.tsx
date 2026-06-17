'use client'

import type { UiToolProps } from '../define-ui-tool'

/** One cited docs source. */
interface Source {
  title: string
  path: string
  anchor?: string
}

/** `cite` tool args — see `citeTool` in `protocol.ts`. */
interface CitationsArgs {
  sources: Source[]
}

function narrow(args: unknown): CitationsArgs | null {
  if (typeof args !== 'object' || args === null) return null
  const raw = (args as Record<string, unknown>).sources
  if (!Array.isArray(raw)) return null
  const sources: Source[] = []
  for (const s of raw) {
    if (typeof s !== 'object' || s === null) continue
    const o = s as Record<string, unknown>
    if (typeof o.title !== 'string' || typeof o.path !== 'string') continue
    sources.push({
      title: o.title,
      path: o.path,
      anchor: typeof o.anchor === 'string' ? o.anchor : undefined,
    })
  }
  if (sources.length === 0) return null
  return { sources }
}

/** Build a same-origin deep link to a docs page#anchor, ignoring absolute URLs. */
function hrefFor(s: Source): string {
  const path = s.path.startsWith('/') ? s.path : `/${s.path}`
  return s.anchor ? `${path}#${s.anchor}` : path
}

/**
 * Citation cards that deep-link into `/docs/...#anchor`. Fancy: numbered chips,
 * arrow affordance, hover lift — all on `--ak-*` tokens.
 */
export function Citations({ args }: UiToolProps<unknown>) {
  const a = narrow(args)
  if (!a) return null
  return (
    <div data-ak-tool="cite" className="my-1">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ak-graphite">
        Sources
      </div>
      <ul className="flex flex-col gap-1.5">
        {a.sources.map((s, i) => (
          <li key={`${s.path}-${i}`}>
            <a
              href={hrefFor(s)}
              data-ak-citation=""
              className="group flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-2.5 py-1.5 text-xs transition-colors hover:border-ak-blue"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ak-border bg-ak-midnight font-mono text-[10px] text-ak-blue">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ak-foam group-hover:text-ak-blue">
                  {s.title}
                </span>
                <span className="block truncate font-mono text-[10px] text-ak-graphite">
                  {hrefFor(s)}
                </span>
              </span>
              <span aria-hidden className="text-ak-graphite transition-transform group-hover:translate-x-0.5 group-hover:text-ak-blue">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
