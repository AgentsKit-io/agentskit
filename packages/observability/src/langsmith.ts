import type { AgentEvent, Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'
import { snapshotAttributes } from './http-batch-sink'

export interface LangSmithConfig {
  apiKey: string
  projectName?: string
  endpoint?: string
  /** Isolated error sink; throws/rejections never escape the observer. */
  onError?: (error: unknown) => void | Promise<void>
}

export interface LangSmithObserver extends Observer {
  flush(): Promise<void>
  shutdown(): Promise<void>
}

interface LangSmithClient {
  createRun(params: Record<string, unknown>): Promise<void>
  updateRun(id: string, params: Record<string, unknown>): Promise<void>
  /** Present on langsmith Client ≥0.8; optional for older/mocks. */
  awaitPendingTraceBatches?: () => Promise<void>
}

interface SpanRemote {
  created: Promise<boolean>
  resolveCreated: (ok: boolean) => void
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
 * LangSmith observer. Construction is pure (no SDK import). The SDK is loaded
 * lazily on the first span that needs a remote run.
 */
export function langsmith(config: LangSmithConfig): LangSmithObserver {
  const { apiKey, projectName = 'agentskit', endpoint = 'https://api.smith.langchain.com' } = config
  const onError = config.onError

  let clientPromise: Promise<LangSmithClient | null> | null = null
  /** Set only after successful client construction. */
  let initializedClient: LangSmithClient | null = null
  let missingWarned = false
  let acceptingEvents = true
  let shutDown = false
  let shutdownPromise: Promise<void> | null = null
  const spanState = new Map<string, SpanRemote>()
  const pending = new Set<Promise<unknown>>()

  const emit = (error: unknown): void => emitError(onError, error)

  function track<T>(promise: Promise<T>): Promise<T> {
    pending.add(promise)
    void promise.then(
      () => pending.delete(promise),
      () => pending.delete(promise),
    )
    return promise
  }

  const getClient = (): Promise<LangSmithClient | null> => {
    if (clientPromise) return clientPromise
    clientPromise = track(
      (async (): Promise<LangSmithClient | null> => {
        try {
          const mod = await import('langsmith')
          const ClientClass = mod.Client as unknown as new (c: {
            apiKey: string
            apiUrl: string
          }) => LangSmithClient
          const client = new ClientClass({ apiKey, apiUrl: endpoint })
          initializedClient = client
          return client
        } catch (cause) {
          if (!missingWarned) {
            missingWarned = true
            console.warn(
              '[@agentskit/observability] Optional peer `langsmith` failed to load; spans will not be sent. Add: pnpm add langsmith',
              cause,
            )
          }
          emit(cause)
          return null
        }
      })(),
    )
    return clientPromise
  }

  const ensureSpanState = (id: string): SpanRemote => {
    let state = spanState.get(id)
    if (!state) {
      let resolveCreated!: (ok: boolean) => void
      const created = new Promise<boolean>((resolve) => {
        resolveCreated = resolve
      })
      state = { created, resolveCreated }
      spanState.set(id, state)
    }
    return state
  }

  const startRemote = (span: TraceSpan): void => {
    if (shutDown) return
    const state = ensureSpanState(span.id)
    const parentId = span.parentId
    const parentState = parentId ? spanState.get(parentId) : undefined
    const inputs = snapshotAttributes(span.attributes)

    void track(
      (async (): Promise<void> => {
        try {
          if (parentState) {
            const parentOk = await parentState.created
            if (!parentOk) {
              state.resolveCreated(false)
              spanState.delete(span.id)
              return
            }
          }
          const client = await getClient()
          if (!client) {
            state.resolveCreated(false)
            spanState.delete(span.id)
            return
          }
          await client.createRun({
            id: span.id,
            name: span.name,
            run_type: span.name.startsWith('gen_ai') ? 'llm' : 'tool',
            project_name: projectName,
            parent_run_id: span.parentId ?? undefined,
            start_time: span.startTime,
            inputs,
          })
          state.resolveCreated(true)
        } catch (error) {
          emit(error)
          state.resolveCreated(false)
          spanState.delete(span.id)
        }
      })(),
    )
  }

  const endRemote = (span: TraceSpan): void => {
    if (shutDown && !spanState.has(span.id)) return
    const state = spanState.get(span.id) ?? ensureSpanState(span.id)
    const outputs = snapshotAttributes(span.attributes)

    void track(
      (async (): Promise<void> => {
        try {
          const createdOk = await state.created
          if (!createdOk) return
          const client = await getClient()
          if (!client) return
          await client.updateRun(span.id, {
            end_time: span.endTime,
            outputs,
            error:
              span.status === 'error'
                ? String(span.attributes['error.message'] ?? 'unknown')
                : undefined,
          })
        } catch (error) {
          emit(error)
        } finally {
          spanState.delete(span.id)
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
    for (let i = 0; i < 100; i++) {
      if (pending.size === 0) return
      const batch = [...pending]
      await Promise.allSettled(batch)
    }
  }

  async function flushSdkBatches(): Promise<void> {
    const client = initializedClient
    if (!client || typeof client.awaitPendingTraceBatches !== 'function') return
    try {
      await client.awaitPendingTraceBatches()
    } catch (error) {
      emit(error)
    }
  }

  async function flush(): Promise<void> {
    if (shutDown) return
    try {
      tracker.flush()
      await waitPending()
      await flushSdkBatches()
    } catch (error) {
      emit(error)
    }
  }

  async function shutdown(): Promise<void> {
    if (shutdownPromise) return shutdownPromise
    acceptingEvents = false
    shutdownPromise = (async () => {
      try {
        await flush()
      } catch (error) {
        emit(error)
      } finally {
        shutDown = true
      }
    })()
    return shutdownPromise
  }

  return {
    name: 'langsmith',
    on(event: AgentEvent) {
      if (!acceptingEvents || shutDown) return
      try {
        tracker.handle(event)
      } catch (error) {
        emit(error)
      }
    },
    flush,
    shutdown,
  }
}
