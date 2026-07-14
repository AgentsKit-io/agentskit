import { AdapterError, ErrorCodes, type Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from '@agentskit/observability'

export interface LangfuseConfig {
  publicKey?: string
  secretKey?: string
  baseUrl?: string
  release?: string
  environment?: string
  sessionId?: string
  userId?: string
  tags?: string[]
  flushAt?: number
  flushInterval?: number
}

interface LangfuseTrace {
  id: string
  update(params: Record<string, unknown>): LangfuseTrace
  span(params: Record<string, unknown>): LangfuseSpan
  generation(params: Record<string, unknown>): LangfuseSpan
  event(params: Record<string, unknown>): unknown
}

interface LangfuseSpan {
  id: string
  end(params?: Record<string, unknown>): unknown
  update(params: Record<string, unknown>): LangfuseSpan
  span?(params: Record<string, unknown>): LangfuseSpan
  generation?(params: Record<string, unknown>): LangfuseSpan
}

interface LangfuseClient {
  trace(params: Record<string, unknown>): LangfuseTrace
  flushAsync(): Promise<void>
  shutdownAsync(): Promise<void>
}

const envOr = (k: string, fallback?: string): string | undefined => {
  if (typeof process === 'undefined' || !process.env) return fallback
  return process.env[k] ?? fallback
}

const isLlmSpan = (name: string): boolean => name.startsWith('gen_ai')
const isToolSpan = (name: string): boolean => name.startsWith('agentskit.tool')

export function langfuse(config: LangfuseConfig = {}): Observer {
  const publicKey = config.publicKey ?? envOr('LANGFUSE_PUBLIC_KEY')
  const secretKey = config.secretKey ?? envOr('LANGFUSE_SECRET_KEY')
  const baseUrl = config.baseUrl ?? envOr('LANGFUSE_HOST') ?? 'https://cloud.langfuse.com'
  const release = config.release ?? envOr('LANGFUSE_RELEASE')
  const environment = config.environment ?? envOr('LANGFUSE_ENVIRONMENT')

  let clientPromise: Promise<LangfuseClient> | null = null
  let tracePromise: Promise<LangfuseTrace> | null = null
  const spanPromises = new Map<string, Promise<LangfuseSpan | null>>()

  const getClient = (): Promise<LangfuseClient> => {
    if (clientPromise) return clientPromise
    clientPromise = (async () => {
      try {
        const mod = await import('langfuse')
        const Ctor = (mod.Langfuse ?? (mod as { default?: unknown }).default) as unknown as
          | (new (c: Record<string, unknown>) => LangfuseClient)
          | undefined
        if (typeof Ctor !== 'function') {
          throw new AdapterError({
            code: ErrorCodes.AK_ADAPTER_MISSING,
            message: 'langfuse package is missing or invalid: no `Langfuse` export.',
            hint: 'Add the optional peer dependency: pnpm add langfuse',
          })
        }
        return new Ctor({
          publicKey,
          secretKey,
          baseUrl,
          release,
          environment,
          flushAt: config.flushAt ?? 15,
          flushInterval: config.flushInterval ?? 1_000,
        })
      } catch (cause) {
        console.warn(
          '[@agentskit/observability/langfuse] Optional peer `langfuse` failed to load; spans will not be sent.',
          cause,
        )
        throw cause instanceof AdapterError
          ? cause
          : new AdapterError({
              code: ErrorCodes.AK_ADAPTER_MISSING,
              message: cause instanceof Error ? cause.message : String(cause),
              hint: 'Add the optional peer dependency: pnpm add langfuse',
              cause,
            })
      }
    })()
    return clientPromise
  }

  const ensureTrace = (): Promise<LangfuseTrace> => {
    if (tracePromise) return tracePromise
    tracePromise = (async () => {
      const client = await getClient()
      return client.trace({
        name: 'agentskit.run',
        sessionId: config.sessionId,
        userId: config.userId,
        tags: config.tags,
        release,
      })
    })()
    return tracePromise
  }

  const startRemote = (span: TraceSpan) => {
    const parentPromise = span.parentId ? spanPromises.get(span.parentId) ?? null : null
    const p = (async (): Promise<LangfuseSpan | null> => {
      try {
        const trace = await ensureTrace()
        const parent = parentPromise ? await parentPromise : null
        const host: LangfuseTrace | LangfuseSpan = parent ?? trace
        const params: Record<string, unknown> = {
          id: span.id,
          name: span.name,
          startTime: new Date(span.startTime),
          metadata: span.attributes,
        }
        if (isLlmSpan(span.name)) {
          const gen = host.generation
          if (!gen) return null
          return gen.call(host, {
            ...params,
            model: span.attributes['gen_ai.request.model'],
            input: span.attributes['agentskit.message_count'],
          })
        }
        const sp = host.span
        if (!sp) return null
        return sp.call(host, params)
      } catch {
        return null
      }
    })()
    spanPromises.set(span.id, p)
  }

  const endRemote = (span: TraceSpan) => {
    void (async () => {
      try {
        const remote = await spanPromises.get(span.id)
        if (!remote) return
        const usage = isLlmSpan(span.name)
          ? {
              input: span.attributes['gen_ai.usage.input_tokens'],
              output: span.attributes['gen_ai.usage.output_tokens'],
              unit: 'TOKENS',
            }
          : undefined
        const hasError = span.status === 'error' || span.attributes['error.message'] !== undefined
        remote.end({
          endTime: span.endTime ? new Date(span.endTime) : new Date(),
          output:
            span.attributes['gen_ai.response.content'] ?? span.attributes['agentskit.tool.result'],
          level: hasError ? 'ERROR' : 'DEFAULT',
          statusMessage: hasError ? String(span.attributes['error.message'] ?? 'unknown') : undefined,
          ...(usage ? { usage } : {}),
        })
      } catch {
      }
    })()
  }

  const tracker = createTraceTracker({
    onSpanStart(span) {
      startRemote(span)
    },
    onSpanEnd(span) {
      endRemote(span)
    },
  })

  return {
    name: 'langfuse',
    on(event) {
      tracker.handle(event)
    },
  }
}

export const __testables = { isLlmSpan, isToolSpan }
