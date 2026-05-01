import type { Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'

export interface AxiomSinkConfig {
  /** Axiom API token. */
  token: string
  /** Dataset name to write into. */
  dataset: string
  /** Override the ingest endpoint (e.g. EU region: `https://api.eu.axiom.co`). */
  endpoint?: string
  /** Service name attached to every event. */
  service?: string
  fetch?: typeof globalThis.fetch
}

function endpointFor(config: AxiomSinkConfig): string {
  const base = config.endpoint ?? 'https://api.axiom.co'
  return `${base}/v1/datasets/${encodeURIComponent(config.dataset)}/ingest`
}

function spanToEvent(span: TraceSpan, config: AxiomSinkConfig, isEnd: boolean): Record<string, unknown> {
  return {
    _time: new Date(isEnd && span.endTime ? span.endTime : span.startTime).toISOString(),
    service: config.service ?? 'agentskit',
    phase: isEnd ? 'end' : 'start',
    span_id: span.id,
    parent_id: span.parentId,
    name: span.name,
    start_time: span.startTime,
    end_time: span.endTime,
    duration_ms: span.endTime ? span.endTime - span.startTime : null,
    status: span.status,
    attributes: span.attributes,
  }
}

/**
 * Axiom sink. POSTs each span start/end as one event to a dataset's ingest
 * endpoint. Errors are swallowed.
 */
export function axiomSink(config: AxiomSinkConfig): Observer {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const url = endpointFor(config)

  const send = async (span: TraceSpan, isEnd: boolean) => {
    try {
      await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify([spanToEvent(span, config, isEnd)]),
      })
    } catch {
      // observability errors must not break the main loop
    }
  }

  const tracker = createTraceTracker({
    onSpanStart(span) { void send(span, false) },
    onSpanEnd(span) { void send(span, true) },
  })

  return {
    name: 'axiom',
    on(event) { tracker.handle(event) },
  }
}
