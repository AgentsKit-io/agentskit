'use client'

import type { UiToolProps } from '../define-ui-tool'

/** `openPage` tool args — see `openPageTool` in `protocol.ts`. */
interface OpenPageArgs {
  title: string
  path: string
  anchor?: string
}

function narrow(args: unknown): OpenPageArgs | null {
  if (typeof args !== 'object' || args === null) return null
  const o = args as Record<string, unknown>
  if (typeof o.title !== 'string' || typeof o.path !== 'string') return null
  return {
    title: o.title,
    path: o.path,
    anchor: typeof o.anchor === 'string' ? o.anchor : undefined,
  }
}

function hrefFor(a: OpenPageArgs): string {
  const path = a.path.startsWith('/') ? a.path : `/${a.path}`
  return a.anchor ? `${path}#${a.anchor}` : path
}

/**
 * A single docs-page card link. Fancier than a citation chip: a full-width card
 * with a "page" glyph and a strong call-to-action affordance.
 */
export function OpenPage({ args }: UiToolProps<unknown>) {
  const a = narrow(args)
  if (!a) return null
  const href = hrefFor(a)
  return (
    <a
      data-ak-tool="openPage"
      href={href}
      className="group my-1 flex items-center gap-3 rounded-lg border border-ak-border bg-gradient-to-br from-ak-surface to-ak-midnight px-3 py-2.5 transition-colors hover:border-ak-blue"
    >
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ak-border bg-ak-midnight font-mono text-sm text-ak-blue"
      >
        §
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-semibold text-ak-foam group-hover:text-ak-blue">
          {a.title}
        </span>
        <span className="block truncate font-mono text-[10px] text-ak-graphite">{href}</span>
      </span>
      <span
        aria-hidden
        className="font-mono text-xs text-ak-graphite transition-transform group-hover:translate-x-0.5 group-hover:text-ak-blue"
      >
        →
      </span>
    </a>
  )
}
