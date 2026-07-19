import type { AgentEvent, Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'
import { snapshotAttributes } from './http-batch-sink'

export interface OpenTelemetryConfig {
  endpoint?: string
  serviceName?: string
  /** Isolated error sink; throws/rejections never escape the observer. */
  onError?: (error: unknown) => void | Promise<void>
}

export interface OpenTelemetryObserver extends Observer {
  flush(): Promise<void>
  shutdown(): Promise<void>
}

interface OtelTracer {
  startSpan: (
    name: string,
    options?: { startTime?: number; attributes?: Record<string, string> },
    context?: unknown,
  ) => OtelSpan
}

interface OtelApi {
  SpanStatusCode: { ERROR: number; OK: number }
  context: { active: () => unknown }
  trace: {
    getTracer: (name: string, version?: string) => OtelTracer
    setSpan: (ctx: unknown, span: OtelSpan) => unknown
    setGlobalTracerProvider?: (provider: OwnedProvider) => boolean
  }
}

interface OtelSpan {
  setAttribute(key: string, value: string): void
  setStatus(status: { code: number; message?: string }): void
  end(endTime?: number): void
}

interface OwnedProvider {
  forceFlush(): Promise<void>
  shutdown(): Promise<void>
  getTracer(name: string, version?: string): OtelTracer
}

interface OtelBridge {
  startSpan(span: TraceSpan): void
  endSpan(span: TraceSpan): void
  forceFlush(): Promise<void>
  shutdownOwned(): Promise<void>
}

function emitError(
  onError: ((error: unknown) => void | Promise<void>) | undefined,
  error: unknown,
): void {
  if (!onError) return
  try {
    const result = onError(error)
    if (result != null && typeof (result as Promise<void>).then === 'function') {
      void Promise.resolve(result).catch(() => {})
    }
  } catch {
    // isolate
  }
}

/**
 * OpenTelemetry observer. Construction is pure. SDK modules load lazily on the
 * first span. Owned providers use OTel JS v2 `spanProcessors` constructor config.
 */
export function opentelemetry(config: OpenTelemetryConfig = {}): OpenTelemetryObserver {
  const { endpoint = 'http://localhost:4318/v1/traces', serviceName = 'agentskit' } = config
  const onError = config.onError
  const report = (error: unknown): void => emitError(onError, error)

  let bridgeReady: Promise<OtelBridge | null> | null = null
  let acceptingEvents = true
  let shutDown = false
  let shutdownPromise: Promise<void> | null = null
  const pending = new Set<Promise<unknown>>()
  const startPromises = new Map<string, Promise<void>>()

  function track<T>(promise: Promise<T>): Promise<T> {
    pending.add(promise)
    void promise.then(
      () => pending.delete(promise),
      () => pending.delete(promise),
    )
    return promise
  }

  async function disposeProvider(provider: OwnedProvider): Promise<void> {
    try {
      await provider.shutdown()
    } catch (error) {
      report(error)
    }
  }

  const getBridge = (): Promise<OtelBridge | null> => {
    if (bridgeReady) return bridgeReady
    bridgeReady = track(
      (async (): Promise<OtelBridge | null> => {
        let api: OtelApi
        try {
          api = (await import('@opentelemetry/api')) as unknown as OtelApi
        } catch (cause) {
          report(cause)
          return null
        }

        let ownedProvider: OwnedProvider | null = null
        let candidateProvider: OwnedProvider | null = null
        let tracer: OtelTracer = api.trace.getTracer(serviceName, '0.4.0')

        try {
          const sdk = (await import('@opentelemetry/sdk-trace-base')) as unknown as {
            BasicTracerProvider: new (config?: Record<string, unknown>) => OwnedProvider
            BatchSpanProcessor: new (exporter: unknown) => unknown
          }
          const otlp = (await import('@opentelemetry/exporter-trace-otlp-http')) as unknown as {
            OTLPTraceExporter: new (config: { url: string }) => unknown
          }

          const exporter = new otlp.OTLPTraceExporter({ url: endpoint })
          const processor = new sdk.BatchSpanProcessor(exporter)
          const provider = new sdk.BasicTracerProvider({
            spanProcessors: [processor],
          })
          candidateProvider = provider

          const setGlobal = api.trace.setGlobalTracerProvider
          if (typeof setGlobal === 'function') {
            let registered = false
            try {
              registered = setGlobal.call(api.trace, provider)
            } catch (error) {
              report(error)
            }
            if (registered) {
              tracer = api.trace.getTracer(serviceName, '0.4.0')
              ownedProvider = provider
              candidateProvider = null
            } else {
              await disposeProvider(provider)
              candidateProvider = null
              ownedProvider = null
              tracer = api.trace.getTracer(serviceName, '0.4.0')
            }
          } else {
            tracer = provider.getTracer(serviceName, '0.4.0')
            ownedProvider = provider
            candidateProvider = null
          }
        } catch {
          if (candidateProvider) await disposeProvider(candidateProvider)
          ownedProvider = null
          tracer = api.trace.getTracer(serviceName, '0.4.0')
        }

        const spanMap = new Map<string, OtelSpan>()

        return {
          startSpan(span: TraceSpan) {
            const parentOtel = span.parentId ? spanMap.get(span.parentId) : undefined
            const parentCtx = parentOtel
              ? api.trace.setSpan(api.context.active(), parentOtel)
              : api.context.active()

            const attrs: Record<string, string> = {}
            const snap = snapshotAttributes(span.attributes)
            for (const [k, v] of Object.entries(snap)) {
              if (v != null) attrs[k] = String(v)
            }

            const otelSpan = tracer.startSpan(
              span.name,
              { startTime: span.startTime, attributes: attrs },
              parentCtx,
            )
            spanMap.set(span.id, otelSpan)
          },
          endSpan(span: TraceSpan) {
            const otelSpan = spanMap.get(span.id)
            if (!otelSpan) return
            const errors: unknown[] = []
            try {
              try {
                const snap = snapshotAttributes(span.attributes)
                for (const [k, v] of Object.entries(snap)) {
                  if (v != null) otelSpan.setAttribute(k, String(v))
                }
              } catch (error) {
                errors.push(error)
              }
              try {
                if (span.status === 'error') {
                  otelSpan.setStatus({
                    code: api.SpanStatusCode.ERROR,
                    message: String(span.attributes['error.message'] ?? ''),
                  })
                }
              } catch (error) {
                errors.push(error)
              }
              try {
                otelSpan.end(span.endTime)
              } catch (error) {
                errors.push(error)
              }
            } finally {
              spanMap.delete(span.id)
            }
            for (const error of errors) report(error)
          },
          async forceFlush() {
            if (ownedProvider) await ownedProvider.forceFlush()
          },
          async shutdownOwned() {
            if (ownedProvider) await ownedProvider.shutdown()
          },
        }
      })(),
    )
    return bridgeReady
  }

  const onStart = (span: TraceSpan): void => {
    if (shutDown) return
    const p = track(
      (async () => {
        try {
          if (span.parentId) {
            const parentStart = startPromises.get(span.parentId)
            if (parentStart) await parentStart
          }
          const bridge = await getBridge()
          if (!bridge) return
          bridge.startSpan(span)
        } catch (error) {
          report(error)
        }
      })(),
    )
    startPromises.set(span.id, p)
  }

  const onEnd = (span: TraceSpan): void => {
    if (shutDown && !startPromises.has(span.id)) return
    void track(
      (async () => {
        try {
          const startP = startPromises.get(span.id)
          if (startP) await startP
          const bridge = await getBridge()
          if (!bridge) return
          bridge.endSpan(span)
        } catch (error) {
          report(error)
        } finally {
          startPromises.delete(span.id)
        }
      })(),
    )
  }

  const tracker = createTraceTracker({
    onSpanStart: onStart,
    onSpanEnd: onEnd,
  })

  async function waitPending(): Promise<void> {
    for (let i = 0; i < 100; i++) {
      if (pending.size === 0) return
      await Promise.allSettled([...pending])
    }
  }

  async function flush(): Promise<void> {
    if (shutDown) return
    try {
      tracker.flush()
      await waitPending()
      if (bridgeReady) {
        const bridge = await bridgeReady
        if (bridge) await bridge.forceFlush()
      }
    } catch (error) {
      report(error)
    }
  }

  async function shutdown(): Promise<void> {
    if (shutdownPromise) return shutdownPromise
    acceptingEvents = false
    shutdownPromise = (async () => {
      try {
        await flush()
        if (bridgeReady) {
          const bridge = await bridgeReady
          if (bridge) await bridge.shutdownOwned()
        }
      } catch (error) {
        report(error)
      } finally {
        shutDown = true
      }
    })()
    return shutdownPromise
  }

  return {
    name: 'opentelemetry',
    on(event: AgentEvent) {
      if (!acceptingEvents || shutDown) return
      try {
        tracker.handle(event)
      } catch (error) {
        report(error)
      }
    },
    flush,
    shutdown,
  }
}
