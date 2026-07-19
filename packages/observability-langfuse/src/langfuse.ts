import type { AgentEvent } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from '@agentskit/observability'
import {
  envOr,
  isLlmSpan,
  snapshotMetadata,
  snapshotTags,
  validateConfig,
} from './langfuse-snapshot'
import type {
  LangfuseClient,
  LangfuseConfig,
  LangfuseObserver,
  LangfuseSpan,
  LangfuseTrace,
  RunRemoteState,
} from './langfuse-types'

export type { LangfuseConfig, LangfuseObserver } from './langfuse-types'

/**
 * Langfuse observer factory. Construction is pure (no SDK import / I/O).
 * One Langfuse trace per agent run, inferred only by `agent:step` with step 1.
 */
export function langfuse(config: LangfuseConfig = {}): LangfuseObserver {
  validateConfig(config)

  const publicKey = config.publicKey ?? envOr('LANGFUSE_PUBLIC_KEY')
  const secretKey = config.secretKey ?? envOr('LANGFUSE_SECRET_KEY')
  const baseUrl = config.baseUrl ?? envOr('LANGFUSE_HOST') ?? 'https://cloud.langfuse.com'
  const release = config.release ?? envOr('LANGFUSE_RELEASE')
  const environment = config.environment ?? envOr('LANGFUSE_ENVIRONMENT')
  const sessionId = config.sessionId
  const userId = config.userId
  const tags = snapshotTags(config.tags)
  const flushAt = config.flushAt ?? 15
  const flushInterval = config.flushInterval ?? 1_000
  const onError = config.onError

  let clientPromise: Promise<LangfuseClient | null> | null = null
  /** Set only after a successful client construction. */
  let initializedClient: LangfuseClient | null = null
  let missingWarned = false
  let acceptingEvents = true
  let shutDown = false
  let shutdownPromise: Promise<void> | null = null
  let currentRun: RunRemoteState | null = null
  /** Span id → run state that owns it (captures correct state across run rotation). */
  const spanRuns = new Map<string, RunRemoteState>()
  const pending = new Set<Promise<unknown>>()

  function emitError(error: unknown): void {
    if (!onError) return
    try {
      const result = onError(error)
      if (result != null && typeof (result as Promise<void>).then === 'function') {
        void Promise.resolve(result).catch(() => {})
      }
    } catch {
      // Isolate user onError failures.
    }
  }

  function track<T>(promise: Promise<T>): Promise<T> {
    pending.add(promise)
    void promise.then(
      () => pending.delete(promise),
      () => pending.delete(promise),
    )
    return promise
  }

  function createRunState(): RunRemoteState {
    return {
      tracePromise: null,
      spanPromises: new Map(),
    }
  }

  const getClient = (): Promise<LangfuseClient | null> => {
    if (clientPromise) return clientPromise
    clientPromise = track(
      (async (): Promise<LangfuseClient | null> => {
        try {
          const mod = await import('langfuse')
          const Ctor = (mod.Langfuse ?? (mod as { default?: unknown }).default) as unknown as
            | (new (c: Record<string, unknown>) => LangfuseClient)
            | undefined
          if (typeof Ctor !== 'function') {
            if (!missingWarned) {
              missingWarned = true
              console.warn(
                '[@agentskit/observability-langfuse] Optional peer `langfuse` failed to load; spans will not be sent. Add: pnpm add langfuse',
              )
            }
            return null
          }
          const client = new Ctor({
            publicKey,
            secretKey,
            baseUrl,
            release,
            environment,
            flushAt,
            flushInterval,
          })
          initializedClient = client
          return client
        } catch (cause) {
          if (!missingWarned) {
            missingWarned = true
            console.warn(
              '[@agentskit/observability-langfuse] Optional peer `langfuse` failed to load; spans will not be sent.',
              cause,
            )
          }
          emitError(cause)
          return null
        }
      })(),
    )
    return clientPromise
  }

  const ensureTrace = (run: RunRemoteState): Promise<LangfuseTrace | null> => {
    if (run.tracePromise) return run.tracePromise
    run.tracePromise = track(
      (async (): Promise<LangfuseTrace | null> => {
        try {
          const client = await getClient()
          if (!client) return null
          // Do not call trace.end — Langfuse traces are finalized via span ends + flush.
          return client.trace({
            name: 'agentskit.run',
            sessionId,
            userId,
            tags,
            release,
          })
        } catch (error) {
          emitError(error)
          return null
        }
      })(),
    )
    return run.tracePromise
  }

  const startRemote = (span: TraceSpan): void => {
    if (shutDown) return
    const run = currentRun ?? (currentRun = createRunState())
    spanRuns.set(span.id, run)

    const parentId = span.parentId
    // Capture parent promise at start for out-of-order resolution; re-lookup at await time.
    const parentAtStart = parentId ? run.spanPromises.get(parentId) : undefined

    const p = track(
      (async (): Promise<LangfuseSpan | null> => {
        try {
          const trace = await ensureTrace(run)
          if (!trace) return null

          let parent: LangfuseSpan | null = null
          if (parentId) {
            const parentPromise = run.spanPromises.get(parentId) ?? parentAtStart
            if (parentPromise) {
              parent = await parentPromise
            }
          }

          const host: LangfuseTrace | LangfuseSpan = parent ?? trace
          const params: Record<string, unknown> = {
            id: span.id,
            name: span.name,
            startTime: new Date(span.startTime),
            metadata: snapshotMetadata(span.attributes),
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
        } catch (error) {
          emitError(error)
          run.spanPromises.delete(span.id)
          spanRuns.delete(span.id)
          return null
        }
      })(),
    )
    run.spanPromises.set(span.id, p)
  }

  const endRemote = (span: TraceSpan): void => {
    if (shutDown && !spanRuns.has(span.id)) return
    const run = spanRuns.get(span.id) ?? currentRun
    if (!run) return

    void track(
      (async (): Promise<void> => {
        try {
          const remote = await run.spanPromises.get(span.id)
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
            statusMessage: hasError
              ? String(span.attributes['error.message'] ?? 'unknown')
              : undefined,
            ...(usage ? { usage } : {}),
          })
        } catch (error) {
          emitError(error)
        } finally {
          run.spanPromises.delete(span.id)
          spanRuns.delete(span.id)
        }
      })(),
    )
  }

  const tracker = createTraceTracker({
    onSpanStart(span) {
      startRemote(span)
    },
    onSpanEnd(span) {
      endRemote(span)
    },
  })

  async function waitPending(): Promise<void> {
    // Drain until stable: new work may be scheduled while awaiting.
    for (let i = 0; i < 100; i++) {
      if (pending.size === 0) return
      const batch = [...pending]
      await Promise.allSettled(batch)
    }
  }

  async function flush(): Promise<void> {
    if (shutDown) {
      // Still allow a no-op flush after shutdown without throwing.
      return
    }
    try {
      // Finalize the natural run: close open tracker spans.
      tracker.flush()
      await waitPending()
      // Only flush the SDK if a client was successfully constructed.
      if (initializedClient) {
        await initializedClient.flushAsync()
      }
    } catch (error) {
      emitError(error)
    }
  }

  async function shutdown(): Promise<void> {
    if (shutdownPromise) return shutdownPromise
    acceptingEvents = false
    shutdownPromise = (async () => {
      try {
        await flush()
        shutDown = true
        if (initializedClient) {
          try {
            await initializedClient.shutdownAsync()
          } catch (error) {
            emitError(error)
          }
        } else {
          shutDown = true
        }
      } catch (error) {
        shutDown = true
        emitError(error)
      } finally {
        shutDown = true
      }
    })()
    return shutdownPromise
  }

  return {
    name: 'langfuse',
    on(event: AgentEvent) {
      if (!acceptingEvents || shutDown) return
      try {
        // Run boundary: only agent:step with step === 1 opens a new remote run/trace.
        if (event.type === 'agent:step' && event.step === 1) {
          currentRun = createRunState()
        } else if (!currentRun) {
          // Partial streams without step 1 still get a single run state.
          currentRun = createRunState()
        }
        tracker.handle(event)
      } catch (error) {
        emitError(error)
      }
    },
    flush,
    shutdown,
  }
}
