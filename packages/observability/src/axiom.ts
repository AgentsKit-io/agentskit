import type { TraceSpan } from './trace-tracker'
import {
  createHttpBatchSink,
  snapshotAttributes,
  type HttpBatchOptions,
  type LifecycleObserver,
} from './http-batch-sink'

export interface AxiomSinkConfig extends HttpBatchOptions {
  /** Axiom API token. */
  token: string
  /** Dataset name to write into. */
  dataset: string
  /** Override the ingest endpoint (e.g. EU region: `https://api.eu.axiom.co`). */
  endpoint?: string
  /** Service name attached to every event. */
  service?: string
}

export type AxiomSinkObserver = LifecycleObserver

function endpointFor(config: AxiomSinkConfig): string {
  const base = config.endpoint ?? 'https://api.axiom.co'
  return `${base}/v1/datasets/${encodeURIComponent(config.dataset)}/ingest`
}

function spanToEvent(
  span: TraceSpan,
  config: AxiomSinkConfig,
  isEnd: boolean,
): Record<string, unknown> {
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
    attributes: snapshotAttributes(span.attributes),
  }
}

/**
 * Axiom sink. Batches span start/end events to a dataset ingest endpoint.
 * Errors are isolated.
 */
export function axiomSink(config: AxiomSinkConfig): AxiomSinkObserver {
  return createHttpBatchSink({
    name: 'axiom',
    url: endpointFor(config),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.token}`,
    },
    toPayload: (span, isEnd) => spanToEvent(span, config, isEnd),
    options: config,
  })
}
