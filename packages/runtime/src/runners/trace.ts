import type { RunnerTraceSpan } from './types'

/** Builds the span list a runner returns as its trace. */
export interface RunnerTraceRecorder {
  /** Span covering the whole run; children point at it via `parentId`. */
  readonly root: RunnerTraceSpan
  child(name: string, attributes?: Record<string, unknown>): RunnerTraceSpan
  end(span: RunnerTraceSpan, status?: 'ok' | 'error', attributes?: Record<string, unknown>): void
  spans(): RunnerTraceSpan[]
}

/** Start a trace with a root span `runner:<id>`; children created via `child` hang off it. */
export function createTraceRecorder(
  runnerId: string,
  attributes: Record<string, unknown> = {},
  now: () => number = Date.now,
): RunnerTraceRecorder {
  let counter = 0
  const all: RunnerTraceSpan[] = []
  const open = (name: string, parentId: string | null, attrs: Record<string, unknown>): RunnerTraceSpan => {
    const span: RunnerTraceSpan = {
      id: `${runnerId}-${++counter}`,
      name,
      parentId,
      startTime: now(),
      attributes: attrs,
      status: 'ok',
    }
    all.push(span)
    return span
  }
  const root = open(`runner:${runnerId}`, null, { 'runner.id': runnerId, ...attributes })
  return {
    root,
    child: (name, attrs = {}) => open(name, root.id, attrs),
    end(span, status = 'ok', attrs = {}) {
      span.endTime = now()
      span.status = status
      Object.assign(span.attributes, attrs)
    },
    spans: () => all,
  }
}
