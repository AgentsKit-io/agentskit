import type { TraceSpan } from './trace-tracker'
import {
  createHttpBatchSink,
  snapshotAttributes,
  type HttpBatchOptions,
  type LifecycleObserver,
} from './http-batch-sink'

export interface NewRelicSinkConfig extends HttpBatchOptions {
  /** New Relic license / API key (NRAK-... or license key). */
  apiKey: string
  /** Region. `'US'` (default) → log-api.newrelic.com, `'EU'` → log-api.eu.newrelic.com. */
  region?: 'US' | 'EU'
  /** Service name attached to every event. */
  service?: string
}

export type NewRelicSinkObserver = LifecycleObserver

function endpointFor(region: 'US' | 'EU' = 'US'): string {
  return region === 'EU'
    ? 'https://log-api.eu.newrelic.com/log/v1'
    : 'https://log-api.newrelic.com/log/v1'
}

function spanToLog(
  span: TraceSpan,
  config: NewRelicSinkConfig,
  isEnd: boolean,
): Record<string, unknown> {
  return {
    timestamp: isEnd && span.endTime ? span.endTime : span.startTime,
    message: `${span.name} ${isEnd ? 'ended' : 'started'}`,
    service: config.service ?? 'agentskit',
    phase: isEnd ? 'end' : 'start',
    'span.id': span.id,
    'span.parent_id': span.parentId,
    'span.name': span.name,
    'span.start_time': span.startTime,
    'span.end_time': span.endTime,
    'span.duration_ms': span.endTime ? span.endTime - span.startTime : undefined,
    'span.status': span.status,
    attributes: snapshotAttributes(span.attributes),
  }
}

/**
 * New Relic Logs sink. Batches span start/end events to New Relic's Log API.
 * Errors are isolated.
 */
export function newRelicSink(config: NewRelicSinkConfig): NewRelicSinkObserver {
  return createHttpBatchSink({
    name: 'new-relic',
    url: endpointFor(config.region),
    headers: {
      'content-type': 'application/json',
      'api-key': config.apiKey,
    },
    toPayload: (span, isEnd) => spanToLog(span, config, isEnd),
    options: config,
  })
}
