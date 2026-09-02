import type { TraceSpan } from './trace-tracker'
import { ConfigError, ErrorCodes } from '@agentskit/core'

export interface TraceReport {
  traceId: string
  startTime: number
  endTime: number
  durationMs: number
  spanCount: number
  errorCount: number
  spans: TraceSpan[]
}

/**
 * Summarize a flat span list into a `TraceReport` — totals,
 * error count, wall-clock duration. The report JSON is the
 * on-disk format written by `createFileTraceSink` and the
 * input consumed by `renderTraceViewerHtml`.
 */
export function buildTraceReport(traceId: string, spans: TraceSpan[]): TraceReport {
  const starts = spans.map(s => s.startTime)
  const ends = spans.map(s => s.endTime ?? s.startTime)
  const startTime = starts.length > 0 ? Math.min(...starts) : 0
  const endTime = ends.length > 0 ? Math.max(...ends) : 0
  const errorCount = spans.filter(s => s.status === 'error').length
  return {
    traceId,
    startTime,
    endTime,
    durationMs: Math.max(0, endTime - startTime),
    spanCount: spans.length,
    errorCount,
    spans: spans.slice().sort((a, b) => a.startTime - b.startTime),
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Render a self-contained HTML page visualizing a `TraceReport` as
 * a gantt-style waterfall — no JS dependency, no network. Open
 * the output file in a browser for offline Jaeger-style debugging.
 */
export function renderTraceViewerHtml(report: TraceReport): string {
  const duration = Math.max(1, report.durationMs)
  const rows = report.spans
    .map(span => {
      const leftPct = ((span.startTime - report.startTime) / duration) * 100
      const widthPct = Math.max(
        0.3,
        (((span.endTime ?? span.startTime) - span.startTime) / duration) * 100,
      )
      const cls = span.status === 'error' ? 'error' : 'ok'
      const attrs = Object.entries(span.attributes)
        .map(([k, v]) => `${escapeHtml(k)}=${escapeHtml(String(v)).slice(0, 80)}`)
        .join(', ')
      return `<tr><td class="name">${escapeHtml(span.name)}</td><td class="dur">${(((span.endTime ?? span.startTime) - span.startTime)).toFixed(0)}ms</td><td class="bar"><div class="seg ${cls}" style="margin-left:${leftPct.toFixed(2)}%;width:${widthPct.toFixed(2)}%"></div></td><td class="attrs">${attrs}</td></tr>`
    })
    .join('\n')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>AgentsKit trace ${escapeHtml(report.traceId)}</title>
<style>
  body { font: 13px/1.4 -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 16px; background: #0f1115; color: #e8e8ea }
  h1 { font-size: 14px; margin: 0 0 8px }
  .meta { color: #8b8d95; font-size: 12px; margin-bottom: 12px }
  table { width: 100%; border-collapse: collapse; background: #161920; border-radius: 6px; overflow: hidden }
  th, td { padding: 6px 8px; border-bottom: 1px solid #23262e; text-align: left }
  th { background: #1b1e25; font-weight: 600; color: #bdbfc6 }
  td.bar { padding: 0 8px; width: 40%; min-width: 300px }
  .seg { height: 12px; border-radius: 3px; background: #4c9aff }
  .seg.error { background: #f15c5c }
  td.name { font-family: ui-monospace, monospace }
  td.dur { color: #8b8d95; text-align: right; width: 60px }
  td.attrs { color: #8b8d95; font-size: 11px }
</style>
</head><body>
<h1>Trace ${escapeHtml(report.traceId)}</h1>
<div class="meta">${report.spanCount} spans · ${report.errorCount} errors · ${report.durationMs}ms</div>
<table>
<thead><tr><th>Span</th><th>Dur</th><th>Timeline</th><th>Attributes</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body></html>
`
}

export interface FileTraceSink {
  /** Observer-compatible span callbacks. Plug into `createTraceTracker`. */
  onSpanStart: (span: TraceSpan) => void
  onSpanEnd: (span: TraceSpan) => void
  /** Snapshot of spans recorded so far. */
  spans: () => TraceSpan[]
  /** Write collected spans as a JSON report and a sibling HTML viewer. Returns written paths. */
  flush: (options?: { traceId?: string; html?: boolean }) => Promise<{ json: string; html?: string }>
}

/**
 * Collect spans in memory and write them to disk on demand. The
 * default layout under `dir` is:
 *   <traceId>.json   — TraceReport (JSON)
 *   <traceId>.html   — offline viewer page (when html !== false)
 */
export function createFileTraceSink(dir: string): FileTraceSink {
  const spans: TraceSpan[] = []

  const patch = (next: TraceSpan): void => {
    const existing = spans.findIndex(s => s.id === next.id)
    if (existing >= 0) spans[existing] = { ...spans[existing]!, ...next }
    else spans.push({ ...next })
  }

  return {
    onSpanStart: patch,
    onSpanEnd: patch,
    spans: () => spans.slice(),
    async flush(options = {}) {
      const { writeFile, mkdir } = await import('node:fs/promises')
      const { join } = await import('node:path')
      const traceId = options.traceId ?? `trace-${Date.now()}`
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(traceId)) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'createFileTraceSink.flush: traceId must be a safe file basename',
          hint: 'Use letters, numbers, dots, underscores, or hyphens only.',
        })
      }
      const report = buildTraceReport(traceId, spans)
      await mkdir(dir, { recursive: true })
      const jsonPath = join(dir, `${traceId}.json`)
      await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8')
      const result: { json: string; html?: string } = { json: jsonPath }
      if (options.html !== false) {
        const htmlPath = join(dir, `${traceId}.html`)
        await writeFile(htmlPath, renderTraceViewerHtml(report), 'utf8')
        result.html = htmlPath
      }
      return result
    },
  }
}
