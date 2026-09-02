import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildTraceReport,
  createFileTraceSink,
  renderTraceViewerHtml,
  type TraceReport,
} from '../src/trace-viewer'
import type { TraceSpan } from '../src/trace-tracker'

function span(id: string, start: number, dur: number, opts: Partial<TraceSpan> = {}): TraceSpan {
  return {
    id,
    name: opts.name ?? 'gen_ai.chat',
    parentId: null,
    startTime: start,
    endTime: start + dur,
    attributes: opts.attributes ?? {},
    status: opts.status ?? 'ok',
  }
}

describe('buildTraceReport', () => {
  it('computes totals and sorts by startTime', () => {
    const r = buildTraceReport('t1', [
      span('b', 200, 100),
      span('a', 100, 50),
      span('c', 400, 20, { status: 'error' }),
    ])
    expect(r.traceId).toBe('t1')
    expect(r.startTime).toBe(100)
    expect(r.endTime).toBe(420)
    expect(r.durationMs).toBe(320)
    expect(r.spanCount).toBe(3)
    expect(r.errorCount).toBe(1)
    expect(r.spans.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('handles empty span list', () => {
    const r = buildTraceReport('t0', [])
    expect(r.spanCount).toBe(0)
    expect(r.durationMs).toBe(0)
  })

  it('handles spans without endTime', () => {
    const s: TraceSpan = {
      id: 'x',
      name: 'open',
      parentId: null,
      startTime: 50,
      attributes: {},
      status: 'ok',
    }
    const r = buildTraceReport('t', [s])
    expect(r.startTime).toBe(50)
    expect(r.endTime).toBe(50)
  })
})

describe('renderTraceViewerHtml', () => {
  it('returns valid self-contained HTML', () => {
    const report: TraceReport = buildTraceReport('t1', [
      span('a', 100, 50, { name: 'gen_ai.chat' }),
      span('b', 150, 100, { name: 'agentskit.tool.search', status: 'error' }),
    ])
    const html = renderTraceViewerHtml(report)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Trace t1')
    expect(html).toContain('gen_ai.chat')
    expect(html).toContain('agentskit.tool.search')
    expect(html).toContain('class="seg error"')
  })

  it('escapes untrusted attribute values', () => {
    const report = buildTraceReport('t1', [
      span('a', 0, 10, {
        name: '<script>',
        attributes: { 'user.input': '<img src=x onerror=alert(1)>' },
      }),
    ])
    const html = renderTraceViewerHtml(report)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
    expect(html).not.toMatch(/<img\s+src=x\s+onerror=/i)
  })
})

describe('createFileTraceSink', () => {
  it('writes a JSON report and an HTML viewer', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-trace-'))
    try {
      const sink = createFileTraceSink(dir)
      sink.onSpanStart(span('a', 0, 0, { name: 'start' }))
      sink.onSpanEnd(span('a', 0, 10, { name: 'start' }))
      sink.onSpanStart(span('b', 10, 0))
      sink.onSpanEnd(span('b', 10, 5, { status: 'error' }))

      const out = await sink.flush({ traceId: 'demo' })
      expect(existsSync(out.json)).toBe(true)
      expect(existsSync(out.html!)).toBe(true)

      const report = JSON.parse(readFileSync(out.json, 'utf8')) as TraceReport
      expect(report.spanCount).toBe(2)
      expect(report.errorCount).toBe(1)

      const html = readFileSync(out.html!, 'utf8')
      expect(html).toContain('Trace demo')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('html: false skips the viewer file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-trace-'))
    try {
      const sink = createFileTraceSink(dir)
      sink.onSpanStart(span('a', 0, 0))
      sink.onSpanEnd(span('a', 0, 5))
      const out = await sink.flush({ traceId: 'x', html: false })
      expect(out.html).toBeUndefined()
      expect(existsSync(out.json)).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('spans() returns the current snapshot', () => {
    const sink = createFileTraceSink('/tmp/unused')
    sink.onSpanStart(span('a', 0, 0))
    sink.onSpanEnd(span('a', 0, 5))
    expect(sink.spans()).toHaveLength(1)
    expect(sink.spans()[0]!.endTime).toBe(5)
  })

  it('rejects path traversal trace ids', async () => {
    const sink = createFileTraceSink('/tmp/unused')
    await expect(sink.flush({ traceId: '../outside' })).rejects.toMatchObject({
      code: 'AK_CONFIG_INVALID',
    })
  })
})
