'use client'

import type { UiToolProps } from '../define-ui-tool'

/** One clickable choice. */
interface Option {
  label: string
  value: string
}

/** `showOptions` tool args — see `showOptionsTool` in `protocol.ts`. */
interface OptionsArgs {
  prompt?: string
  options: Option[]
}

function narrow(args: unknown): OptionsArgs | null {
  if (typeof args !== 'object' || args === null) return null
  const o = args as Record<string, unknown>
  if (!Array.isArray(o.options)) return null
  const options: Option[] = []
  for (const opt of o.options) {
    if (typeof opt !== 'object' || opt === null) continue
    const r = opt as Record<string, unknown>
    if (typeof r.label !== 'string' || typeof r.value !== 'string') continue
    options.push({ label: r.label, value: r.value })
  }
  if (options.length === 0) return null
  return { prompt: typeof o.prompt === 'string' ? o.prompt : undefined, options }
}

/**
 * Disambiguation / branch buttons. Clicking calls `ctx.onSelect(value)` so the
 * host can send the value as a fresh user turn.
 */
export function Options({ args, ctx }: UiToolProps<unknown>) {
  const a = narrow(args)
  if (!a) return null
  return (
    <div data-ak-tool="showOptions" className="my-1 flex flex-col gap-1.5">
      {a.prompt ? <div className="text-sm text-ak-foam">{a.prompt}</div> : null}
      <div className="flex flex-wrap gap-1.5">
        {a.options.map((opt, i) => (
          <button
            key={`${opt.value}-${i}`}
            type="button"
            data-ak-option=""
            onClick={() => ctx.onSelect?.(opt.value)}
            className="rounded-full border border-ak-border bg-ak-surface px-3 py-1 text-xs font-medium text-ak-foam transition-colors hover:border-ak-blue hover:bg-ak-blue/10 hover:text-ak-blue focus:outline-none focus-visible:border-ak-blue"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
