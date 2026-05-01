import type { Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'

export interface DatadogSinkConfig {
  apiKey: string
  /** Datadog site, defaults to `datadoghq.com` (US1). Use `datadoghq.eu`, `us5.datadoghq.com`, etc. */
  site?: string
  /** Service name attached to every event. */
  service?: string
  /** Environment tag (`prod`, `staging`, ...). */
  env?: string
  fetch?: typeof globalThis.fetch
}

function siteEndpoint(site = 'datadoghq.com'): string {
  return `https://http-intake.logs.${site}/api/v2/logs`
}

function spanToLog(span: TraceSpan, config: DatadogSinkConfig, isEnd: boolean): Record<string, unknown> {
  return {
    ddsource: 'agentskit',
    service: config.service ?? 'agentskit',
    ddtags: [config.env ? `env:${config.env}` : null, `phase:${isEnd ? 'end' : 'start'}`].filter(Boolean).join(','),
    message: `${span.name} ${isEnd ? 'ended' : 'started'}`,
    span: {
      id: span.id,
      parent_id: span.parentId,
      name: span.name,
      start_time: span.startTime,
      end_time: span.endTime,
      duration_ms: span.endTime ? span.endTime - span.startTime : undefined,
      status: span.status,
      attributes: span.attributes,
    },
  }
}

/**
 * Datadog Logs sink. Forwards every TraceSpan start/end as a JSON log entry
 * to Datadog's HTTP intake. Failures are swallowed — observability never
 * breaks the main loop.
 */
export function datadogSink(config: DatadogSinkConfig): Observer {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const url = siteEndpoint(config.site)

  const send = async (span: TraceSpan, isEnd: boolean) => {
    try {
      await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'dd-api-key': config.apiKey,
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
    name: 'datadog',
    on(event) { tracker.handle(event) },
  }
}
