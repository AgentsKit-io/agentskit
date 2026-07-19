import type { TraceSpan } from './trace-tracker'
import {
  createHttpBatchSink,
  snapshotAttributes,
  type HttpBatchOptions,
  type LifecycleObserver,
} from './http-batch-sink'

export interface DatadogSinkConfig extends HttpBatchOptions {
  apiKey: string
  /** Datadog site, defaults to `datadoghq.com` (US1). Use `datadoghq.eu`, `us5.datadoghq.com`, etc. */
  site?: string
  /** Service name attached to every event. */
  service?: string
  /** Environment tag (`prod`, `staging`, ...). */
  env?: string
}

export type DatadogSinkObserver = LifecycleObserver

function siteEndpoint(site = 'datadoghq.com'): string {
  return `https://http-intake.logs.${site}/api/v2/logs`
}

function spanToLog(
  span: TraceSpan,
  config: DatadogSinkConfig,
  isEnd: boolean,
): Record<string, unknown> {
  return {
    ddsource: 'agentskit',
    service: config.service ?? 'agentskit',
    ddtags: [config.env ? `env:${config.env}` : null, `phase:${isEnd ? 'end' : 'start'}`]
      .filter(Boolean)
      .join(','),
    message: `${span.name} ${isEnd ? 'ended' : 'started'}`,
    span: {
      id: span.id,
      parent_id: span.parentId,
      name: span.name,
      start_time: span.startTime,
      end_time: span.endTime,
      duration_ms: span.endTime ? span.endTime - span.startTime : undefined,
      status: span.status,
      attributes: snapshotAttributes(span.attributes),
    },
  }
}

/**
 * Datadog Logs sink. Batches span start/end as JSON log entries to Datadog's
 * HTTP intake. Failures are isolated — observability never breaks the main loop.
 */
export function datadogSink(config: DatadogSinkConfig): DatadogSinkObserver {
  return createHttpBatchSink({
    name: 'datadog',
    url: siteEndpoint(config.site),
    headers: {
      'content-type': 'application/json',
      'dd-api-key': config.apiKey,
    },
    toPayload: (span, isEnd) => spanToLog(span, config, isEnd),
    options: config,
  })
}
