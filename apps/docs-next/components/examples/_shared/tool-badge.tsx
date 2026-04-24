'use client'

import type { ToolCall } from '@agentskit/core'

/**
 * Compact tool-call badge that mirrors the home hero demo:
 * `✓ name({ args }) Nms` in a green pill when complete, blue with a spinner
 * while pending. Use inside <Message>{m.toolCalls?.map(...)}</Message>.
 */
export function ToolBadge({ call }: { call: ToolCall }) {
  const done = call.status === 'complete' || call.status === 'error'
  const error = call.status === 'error'
  const args = formatArgs(call.args)
  const ms = call.durationMs

  return (
    <div
      data-ak-tool-badge
      className={`inline-flex max-w-full items-start gap-2 rounded-md border px-2.5 py-1 font-mono text-xs ${
        error
          ? 'border-ak-red/30 bg-ak-red/5 text-ak-red'
          : done
          ? 'border-ak-green/30 bg-ak-green/5 text-ak-green'
          : 'border-ak-blue/30 bg-ak-blue/5 text-ak-blue'
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {done ? (error ? '✗' : '✓') : <Spinner />}
      </span>
      <span className="min-w-0 break-all">
        {call.name}
        {args ? `(${args})` : '()'}
      </span>
      {done && typeof ms === 'number' ? (
        <span className="shrink-0 text-ak-graphite">{ms}ms</span>
      ) : null}
    </div>
  )
}

function formatArgs(raw: Record<string, unknown> | string | undefined): string {
  if (!raw) return ''
  const parsed =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw)
          } catch {
            return raw
          }
        })()
      : raw
  if (!parsed || typeof parsed !== 'object') return String(parsed)
  const entries = Object.entries(parsed)
  if (entries.length === 0) return ''
  return entries.map(([k, v]) => `${k}: ${stringify(v)}`).join(', ')
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`
  if (value === null) return 'null'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ak-blue border-t-transparent" />
  )
}
