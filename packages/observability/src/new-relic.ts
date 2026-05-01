import type { Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'

export interface NewRelicSinkConfig {
  /** New Relic license / API key (NRAK-... or license key). */
  apiKey: string
  /** Region. `'US'` (default) → log-api.newrelic.com, `'EU'` → log-api.eu.newrelic.com. */
  region?: 'US' | 'EU'
  /** Service name attached to every event. */
  service?: string
  fetch?: typeof globalThis.fetch
}

function endpointFor(region: 'US' | 'EU' = 'US'): string {
  return region === 'EU'
    ? 'https://log-api.eu.newrelic.com/log/v1'
    : 'https://log-api.newrelic.com/log/v1'
}

function spanToLog(span: TraceSpan, config: NewRelicSinkConfig, isEnd: boolean): Record<string, unknown> {
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
    attributes: span.attributes,
  }
}

/**
 * New Relic Logs sink. Forwards span start/end events to New Relic's Log API.
 * Errors are swallowed — observability never breaks the main loop.
 */
export function newRelicSink(config: NewRelicSinkConfig): Observer {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const url = endpointFor(config.region)

  const send = async (span: TraceSpan, isEnd: boolean) => {
    try {
      await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify([spanToLog(span, config, isEnd)]),
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
    name: 'new-relic',
    on(event) { tracker.handle(event) },
  }
}
