'use client'

import { useState, type ReactNode } from 'react'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'

export type ArtifactKind = 'code' | 'markdown' | 'html' | 'chart' | 'json'

export interface ArtifactProps {
  kind: ArtifactKind
  /** Display title (filename / chart label / etc.). */
  title?: string
  /** Body — interpretation depends on `kind`. */
  content: string
  /** Code language for `kind="code"`. Defaults to 'text'. */
  language?: string
  /**
   * For `kind="chart"`: a series of `{ label, value }` rows. JSON-encode
   * into `content` to keep this MDX-compatible.
   */
  height?: number
}

/**
 * AgentsKit `<Artifact />` — Claude.ai-style typed artifact rendered inline.
 *
 * Five kinds:
 *   - `code`     → fumadocs DynamicCodeBlock with syntax highlighting
 *   - `json`     → pretty-printed JSON in a code block
 *   - `markdown` → rendered through the existing fumadocs MD pipeline
 *   - `html`     → sandboxed iframe (no scripts, no same-origin)
 *   - `chart`    → minimal SVG bar chart from `[{label, value}]` JSON
 *
 * All variants share a header with kind + title and a copy button. HTML
 * runs in an `srcDoc` iframe with `sandbox=""` (no script execution, no
 * same-origin) — safe to render LLM-generated HTML.
 */
export function Artifact({ kind, title, content, language = 'text', height = 360 }: ArtifactProps) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div data-ak-artifact data-kind={kind} className="my-6 overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
      <div className="flex items-center justify-between border-b border-ak-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-ak-midnight px-1.5 py-0.5 font-mono uppercase tracking-[0.15em] text-ak-graphite">
            {kind}
          </span>
          {title && <span className="text-ak-foam">{title}</span>}
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded px-2 py-1 text-xs text-ak-graphite hover:bg-ak-midnight hover:text-ak-foam"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <ArtifactBody kind={kind} content={content} language={language} height={height} />
    </div>
  )
}

function ArtifactBody({ kind, content, language, height }: { kind: ArtifactKind; content: string; language: string; height: number }): ReactNode {
  if (kind === 'code') {
    return <DynamicCodeBlock lang={language} code={content} />
  }
  if (kind === 'json') {
    let pretty = content
    try { pretty = JSON.stringify(JSON.parse(content), null, 2) } catch { /* leave as-is */ }
    return <DynamicCodeBlock lang="json" code={pretty} />
  }
  if (kind === 'markdown') {
    // Markdown is treated as code for safety. The docs site has a richer
    // MdRenderer in components/examples/_shared — `<Artifact />` is a
    // generic LLM-output renderer that should NOT execute remark plugins
    // it didn't choose.
    return <DynamicCodeBlock lang="markdown" code={content} />
  }
  if (kind === 'html') {
    return (
      <iframe
        data-ak-artifact-html
        title="HTML artifact"
        srcDoc={content}
        sandbox=""
        style={{ width: '100%', height, border: 0, background: '#0a0a0a' }}
      />
    )
  }
  if (kind === 'chart') {
    let rows: Array<{ label: string; value: number }> = []
    try {
      rows = JSON.parse(content) as Array<{ label: string; value: number }>
    } catch { /* keep empty */ }
    return <BarChart rows={rows} height={height} />
  }
  return null
}

function BarChart({ rows, height }: { rows: Array<{ label: string; value: number }>; height: number }) {
  if (rows.length === 0) {
    return <div className="p-6 text-sm text-ak-graphite">No data.</div>
  }
  const max = Math.max(...rows.map(r => r.value), 0)
  const padding = 24
  const barGap = 8
  const barWidth = 24
  const width = padding * 2 + rows.length * (barWidth + barGap)
  const chartHeight = height - 56
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        role="img"
        aria-label="Bar chart"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width, maxWidth: '100%', height }}
      >
        {rows.map((row, i) => {
          const h = max > 0 ? (row.value / max) * chartHeight : 0
          const x = padding + i * (barWidth + barGap)
          const y = padding + (chartHeight - h)
          return (
            <g key={`${row.label}-${i}`}>
              <rect x={x} y={y} width={barWidth} height={h} fill="currentColor" opacity={0.8} />
              <text x={x + barWidth / 2} y={padding + chartHeight + 14} textAnchor="middle" fontSize="10" fill="currentColor">
                {row.label}
              </text>
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="currentColor">
                {row.value}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
