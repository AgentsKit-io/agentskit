import type { Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'

export interface OpenTelemetryConfig {
  endpoint?: string
  serviceName?: string
}

interface OtelBridge {
  startSpan(span: TraceSpan): void
  endSpan(span: TraceSpan): void
}

export function opentelemetry(config: OpenTelemetryConfig = {}): Observer {
  const { endpoint = 'http://localhost:4318/v1/traces', serviceName = 'agentskit' } = config
  let bridgeReady: Promise<OtelBridge> | null = null

  const getBridge = (): Promise<OtelBridge> => {
    if (bridgeReady) return bridgeReady
    bridgeReady = (async (): Promise<OtelBridge> => {
      let api: typeof import('@opentelemetry/api')
      try {
        api = await import('@opentelemetry/api')
      } catch {
        throw new Error('Install @opentelemetry/api to use the OpenTelemetry observer: npm install @opentelemetry/api')
      }

      // Try to set up the full SDK (optional — user may have their own provider)
      try {
        const sdk = await import('@opentelemetry/sdk-trace-base') as unknown as Record<string, unknown>
        const otlp = await import('@opentelemetry/exporter-trace-otlp-http') as unknown as Record<string, unknown>

        const OTLPExporter = otlp.OTLPTraceExporter as new (config: { url: string }) => unknown
        const exporter = new OTLPExporter({ url: endpoint })

        const BatchProcessor = sdk.BatchSpanProcessor as new (e: unknown) => unknown
        const processor = new BatchProcessor(exporter)

        const Provider = sdk.BasicTracerProvider as new (...args: unknown[]) => { addSpanProcessor?: (p: unknown) => void; register?: () => void; shutdown?: () => Promise<void> }
        const provider = new Provider()
        if (typeof provider.addSpanProcessor === 'function') {
          provider.addSpanProcessor(processor)
        }
        if (typeof provider.register === 'function') {
          provider.register()
        }
      } catch {
        // SDK not available — use whatever provider is already registered
      }

      const tracer = api.trace.getTracer(serviceName, '0.4.0')
      const spanMap = new Map<string, ReturnType<typeof tracer.startSpan>>()

      return {
        startSpan(span: TraceSpan) {
          const parentOtel = span.parentId ? spanMap.get(span.parentId) : undefined
          const parentCtx = parentOtel
            ? api.trace.setSpan(api.context.active(), parentOtel)
            : api.context.active()

          const attrs: Record<string, string> = {}
          for (const [k, v] of Object.entries(span.attributes)) {
            if (v != null) attrs[k] = String(v)
          }

          const otelSpan = tracer.startSpan(span.name, { startTime: span.startTime, attributes: attrs }, parentCtx)
          spanMap.set(span.id, otelSpan)
        },
        endSpan(span: TraceSpan) {
          const otelSpan = spanMap.get(span.id)
          if (!otelSpan) return

          for (const [k, v] of Object.entries(span.attributes)) {
            if (v != null) otelSpan.setAttribute(k, String(v))
          }

          if (span.status === 'error') {
            otelSpan.setStatus({ code: api.SpanStatusCode.ERROR, message: String(span.attributes['error.message'] ?? '') })
          }

          otelSpan.end(span.endTime)
          spanMap.delete(span.id)
        },
      }
    })()
    return bridgeReady
  }

  const tracker = createTraceTracker({
    onSpanStart(span) { void getBridge().then(b => b.startSpan(span)).catch(() => {}) },
    onSpanEnd(span) { void getBridge().then(b => b.endSpan(span)).catch(() => {}) },
  })

  return {
    name: 'opentelemetry',
    on(event) { tracker.handle(event) },
  }
}
