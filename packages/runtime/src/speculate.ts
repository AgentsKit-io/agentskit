import { ConfigError, ErrorCodes, RuntimeError } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'

export interface SpeculativeCandidate {
  /** Human label used in results. */
  id: string
  adapter: AdapterFactory
  /** Cancel this candidate when another wins first. Default true. */
  abortOnLoser?: boolean
}

export interface SpeculativeResult {
  id: string
  chunks: StreamChunk[]
  text: string
  latencyMs: number
  error?: Error
  aborted?: boolean
}

export type SpeculatePicker = (results: SpeculativeResult[]) => string | Promise<string>

export interface SpeculateInput {
  candidates: SpeculativeCandidate[]
  request: AdapterRequest
  /**
   * Picker strategy:
   *  - 'first' (default): first candidate to settle without error
   *  - 'longest': the candidate with the most output text
   *  - function: custom picker receives all results in settle order
   *
   * When 'first' is used, losers are aborted as soon as the winner
   * settles. Custom pickers wait for all candidates to finish first.
   */
  pick?: 'first' | 'longest' | SpeculatePicker
  /** Hard timeout in ms per candidate. Default: none. */
  timeoutMs?: number
}

export interface SpeculateOutput {
  winner: SpeculativeResult
  losers: SpeculativeResult[]
  all: SpeculativeResult[]
}

interface DrainInput {
  source: StreamSource
  timeoutMs?: number
  abortSignal: { aborted: boolean }
}

async function drain({ source, timeoutMs, abortSignal }: DrainInput): Promise<{ chunks: StreamChunk[]; text: string; error?: Error; aborted: boolean }> {
  const chunks: StreamChunk[] = []
  let text = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  let error: Error | undefined

  if (timeoutMs !== undefined) {
    timer = setTimeout(() => {
      timedOut = true
      source.abort()
    }, timeoutMs)
  }
  try {
    for await (const chunk of source.stream()) {
      chunks.push(chunk)
      if (chunk.type === 'text' && typeof chunk.content === 'string') text += chunk.content
      if (abortSignal.aborted) break
    }
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err))
  } finally {
    if (timer) clearTimeout(timer)
  }
  if (timedOut) error = new Error(`timeout after ${timeoutMs}ms`)
  return { chunks, text, error, aborted: abortSignal.aborted }
}

/**
 * Fan out a request to N adapters in parallel, then pick the winner.
 * Common pattern: run a cheap+fast model alongside a slow+accurate
 * one and take whichever finishes first, or use a custom picker to
 * score results (e.g. pick longest, most-on-topic, lowest cost).
 */
export async function speculate(input: SpeculateInput): Promise<SpeculateOutput> {
  if (input.candidates.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'speculate requires at least one candidate',
      hint: 'Pass at least one candidate, e.g. speculate({ candidates: [{ id, adapter }] }).',
    })
  }

  const pickMode = input.pick ?? 'first'
  const signals = input.candidates.map(() => ({ aborted: false }))
  const sources: StreamSource[] = []
  const results: SpeculativeResult[] = []

  const abortLosers = (winnerId: string): void => {
    input.candidates.forEach((c, i) => {
      if (c.id === winnerId) return
      if (c.abortOnLoser === false) return
      signals[i]!.aborted = true
      sources[i]?.abort()
    })
  }

  const tasks = input.candidates.map(async (candidate, i): Promise<SpeculativeResult> => {
    const start = Date.now()
    const source = candidate.adapter.createSource(input.request)
    sources[i] = source
    const { chunks, text, error, aborted } = await drain({
      source,
      timeoutMs: input.timeoutMs,
      abortSignal: signals[i]!,
    })
    const r: SpeculativeResult = {
      id: candidate.id,
      chunks,
      text,
      latencyMs: Date.now() - start,
      error,
      aborted,
    }
    results.push(r)
    return r
  })

  if (pickMode === 'first') {
    const winner = await new Promise<SpeculativeResult>((resolve, reject) => {
      let remaining = tasks.length
      for (const t of tasks) {
        t.then(r => {
          if (!r.error) resolve(r)
          remaining--
          if (remaining === 0) reject(new Error('all speculative candidates failed'))
        }).catch(() => {
          remaining--
          if (remaining === 0) reject(new Error('all speculative candidates failed'))
        })
      }
    })
    abortLosers(winner.id)
    const all = await Promise.all(tasks)
    const losers = all.filter(r => r.id !== winner.id)
    return { winner, losers, all }
  }

  const all = await Promise.all(tasks)
  let winnerId: string
  if (pickMode === 'longest') {
    winnerId = all.reduce((best, r) => (r.text.length > best.text.length ? r : best), all[0]!).id
  } else {
    winnerId = await pickMode(all)
  }
  const winner = all.find(r => r.id === winnerId)
  if (!winner) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: `picker returned unknown id: ${winnerId}`,
      hint: 'Custom pickers must return one of the candidate ids.',
    })
  }
  return { winner, losers: all.filter(r => r.id !== winnerId), all }
}
