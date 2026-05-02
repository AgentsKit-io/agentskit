import { ErrorCodes, RuntimeError } from '@agentskit/core'

/**
 * Temporal-style durable execution primitive. Wraps any side-effectful
 * step in a `runner.step(name, fn)` call; the result is appended to a
 * `StepLogStore`. When the run restarts (after a crash, a deploy, or
 * a retry), replayed steps short-circuit to the recorded value and
 * only new steps execute.
 *
 * Deterministic replay requires two rules from callers:
 *   1. Step names are stable across runs (ideally derived from the
 *      business key — e.g. `search:${query}` — so the log stays
 *      meaningful even as code reorders).
 *   2. Steps are pure *from the perspective of the log* — the fn does
 *      the side effect, the result is everything later steps need.
 */

export interface StepRecord<TResult = unknown> {
  runId: string
  stepId: string
  name: string
  status: 'success' | 'failure'
  result?: TResult
  error?: string
  startedAt: string
  endedAt: string
  attempt: number
}

export interface StepLogStore {
  append: <T>(record: StepRecord<T>) => Promise<void>
  get: <T>(runId: string, stepId: string) => Promise<StepRecord<T> | null>
  list: (runId: string) => Promise<StepRecord<unknown>[]>
  clear?: (runId: string) => Promise<void>
}

export interface DurableRunnerOptions {
  store: StepLogStore
  runId: string
  /** Max attempts per step. Default 1 (fail fast). */
  maxAttempts?: number
  /** Backoff in ms between attempts. Default 0. */
  retryDelayMs?: number
  /** Observability — fires on replay-hit, retry, completion. */
  onEvent?: (event: DurableEvent) => void
}

export type DurableEvent =
  | { type: 'step:replay'; stepId: string; name: string; runId: string }
  | { type: 'step:start'; stepId: string; name: string; runId: string; attempt: number }
  | { type: 'step:success'; stepId: string; name: string; runId: string; durationMs: number }
  | { type: 'step:failure'; stepId: string; name: string; runId: string; error: string; attempt: number }

export interface DurableRunner {
  /**
   * Execute `fn` under the name `stepId`. If the step has already
   * been recorded in the log for this `runId`, return the recorded
   * result without re-running. Otherwise run, record, return.
   */
  step: <TResult>(stepId: string, fn: () => Promise<TResult> | TResult, options?: { name?: string }) => Promise<TResult>
  /** Read the full log for the current run. */
  history: () => Promise<StepRecord<unknown>[]>
  /** Drop the log for the current run (dangerous — breaks resume). */
  reset: () => Promise<void>
}

export function createDurableRunner(options: DurableRunnerOptions): DurableRunner {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 1)
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 0)
  const { store, runId } = options

  const step = async <TResult>(
    stepId: string,
    fn: () => Promise<TResult> | TResult,
    stepOpts: { name?: string } = {},
  ): Promise<TResult> => {
    const name = stepOpts.name ?? stepId
    const existing = await store.get<TResult>(runId, stepId)
    if (existing) {
      options.onEvent?.({ type: 'step:replay', stepId, name, runId })
      if (existing.status === 'success') return existing.result as TResult
      throw new RuntimeError({
        code: ErrorCodes.AK_RUNTIME_STEP_FAILED,
        message: `step "${stepId}" previously failed: ${existing.error}`,
        hint: 'Drop the run log to retry, or fix the underlying cause and use a new runId.',
      })
    }

    let attempt = 0
    let lastError: Error | undefined
    while (attempt < maxAttempts) {
      attempt++
      const startedAt = new Date().toISOString()
      options.onEvent?.({ type: 'step:start', stepId, name, runId, attempt })
      const t0 = Date.now()
      try {
        const result = await fn()
        const endedAt = new Date().toISOString()
        await store.append<TResult>({
          runId,
          stepId,
          name,
          status: 'success',
          result,
          startedAt,
          endedAt,
          attempt,
        })
        options.onEvent?.({ type: 'step:success', stepId, name, runId, durationMs: Date.now() - t0 })
        return result
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        options.onEvent?.({
          type: 'step:failure',
          stepId,
          name,
          runId,
          error: lastError.message,
          attempt,
        })
        if (attempt < maxAttempts && retryDelayMs > 0) {
          await new Promise(r => setTimeout(r, retryDelayMs))
        }
      }
    }

    const endedAt = new Date().toISOString()
    await store.append<TResult>({
      runId,
      stepId,
      name,
      status: 'failure',
      error: lastError?.message ?? 'unknown error',
      startedAt: endedAt,
      endedAt,
      attempt,
    })
    throw lastError ?? new Error(`step "${stepId}" failed`)
  }

  return {
    step,
    async history() {
      return store.list(runId)
    },
    async reset() {
      await store.clear?.(runId)
    },
  }
}

/** In-memory `StepLogStore` — tests, single-process demos, examples. */
export function createInMemoryStepLog(): StepLogStore {
  const byRun = new Map<string, Map<string, StepRecord<unknown>>>()
  return {
    async append(record) {
      let run = byRun.get(record.runId)
      if (!run) {
        run = new Map()
        byRun.set(record.runId, run)
      }
      run.set(record.stepId, { ...record })
    },
    async get<T>(runId: string, stepId: string): Promise<StepRecord<T> | null> {
      const hit = byRun.get(runId)?.get(stepId)
      return hit ? ({ ...(hit as StepRecord<T>) }) : null
    },
    async list(runId) {
      return Array.from(byRun.get(runId)?.values() ?? []).map(r => ({ ...r }))
    },
    async clear(runId) {
      byRun.delete(runId)
    },
  }
}

/** File-backed `StepLogStore` — persists every step as one JSONL line. */
export async function createFileStepLog(path: string): Promise<StepLogStore> {
  const { readFile, writeFile, appendFile, mkdir } = await import('node:fs/promises')
  const { dirname } = await import('node:path')
  await mkdir(dirname(path), { recursive: true })
  try {
    await readFile(path, 'utf8')
  } catch {
    await writeFile(path, '', 'utf8')
  }

  const load = async (): Promise<StepRecord<unknown>[]> => {
    try {
      const raw = await readFile(path, 'utf8')
      return raw
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as StepRecord<unknown>)
    } catch {
      return []
    }
  }

  return {
    async append(record) {
      await appendFile(path, JSON.stringify(record) + '\n', 'utf8')
    },
    async get<T>(runId: string, stepId: string): Promise<StepRecord<T> | null> {
      const all = await load()
      for (let i = all.length - 1; i >= 0; i--) {
        const r = all[i]!
        if (r.runId === runId && r.stepId === stepId) return r as StepRecord<T>
      }
      return null
    },
    async list(runId) {
      return (await load()).filter(r => r.runId === runId)
    },
    async clear(runId) {
      const kept = (await load()).filter(r => r.runId !== runId)
      await writeFile(path, kept.map(r => JSON.stringify(r)).join('\n') + (kept.length ? '\n' : ''), 'utf8')
    },
  }
}
