import { AdapterError, ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'

export interface EnsembleCandidate {
  id: string
  adapter: AdapterFactory
  /** Weight used by 'weighted-vote' aggregator. Default 1. */
  weight?: number
}

export interface EnsembleBranchResult {
  id: string
  text: string
  chunks: StreamChunk[]
  error?: Error
}

export type EnsembleAggregator =
  | 'majority-vote'
  | 'concat'
  | 'longest'
  | ((branches: EnsembleBranchResult[]) => string | Promise<string>)

export interface EnsembleOptions {
  candidates: EnsembleCandidate[]
  /** How to combine branches into the single output text. Default 'majority-vote'. */
  aggregate?: EnsembleAggregator
  /** Per-candidate timeout in ms. Branches that time out are marked with an error. */
  timeoutMs?: number
  /** Observability hook — fires once with every branch's result. */
  onBranches?: (branches: EnsembleBranchResult[]) => void
}

async function drain(source: StreamSource, timeoutMs?: number): Promise<{ chunks: StreamChunk[]; text: string; error?: Error }> {
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
    }
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err))
  } finally {
    if (timer) clearTimeout(timer)
  }
  if (timedOut) error = new Error(`timeout after ${timeoutMs}ms`)
  return { chunks, text, error }
}

function majorityVote(branches: EnsembleBranchResult[], candidates: EnsembleCandidate[]): string {
  const counts = new Map<string, number>()
  const weightById = new Map(candidates.map(c => [c.id, c.weight ?? 1]))
  for (const b of branches) {
    if (b.error) continue
    counts.set(b.text, (counts.get(b.text) ?? 0) + (weightById.get(b.id) ?? 1))
  }
  let best = ''
  let bestScore = -1
  for (const [text, score] of counts) {
    if (score > bestScore) {
      bestScore = score
      best = text
    }
  }
  return best
}

/**
 * Build an AdapterFactory that runs the same request against N
 * candidates in parallel, then aggregates the results into a single
 * text output. Unlike `speculate` (which picks a winner), `ensemble`
 * combines — majority vote, concatenation, longest, or a custom fn.
 *
 * The returned source emits a single `{ type: 'text' }` chunk with
 * the aggregated output followed by `{ type: 'done' }`, so it plugs
 * into any runtime that expects a regular streaming adapter.
 */
export function createEnsembleAdapter(options: EnsembleOptions): AdapterFactory {
  if (options.candidates.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createEnsembleAdapter requires at least one candidate',
      hint: 'Pass at least one candidate, e.g. createEnsembleAdapter({ candidates: [{ id, adapter }] }).',
    })
  }
  const aggregate = options.aggregate ?? 'majority-vote'

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      let aborted = false
      const sources: StreamSource[] = []

      const run = async (): Promise<EnsembleBranchResult[]> => {
        const tasks = options.candidates.map(async (c, i): Promise<EnsembleBranchResult> => {
          const source = c.adapter.createSource(request)
          sources[i] = source
          const { chunks, text, error } = await drain(source, options.timeoutMs)
          return { id: c.id, chunks, text, error }
        })
        return Promise.all(tasks)
      }

      const finalText = async (branches: EnsembleBranchResult[]): Promise<string> => {
        if (typeof aggregate === 'function') return aggregate(branches)
        if (aggregate === 'concat') {
          return branches
            .filter(b => !b.error)
            .map(b => b.text)
            .join('\n---\n')
        }
        if (aggregate === 'longest') {
          return branches
            .filter(b => !b.error)
            .reduce(
              (best, b) => (b.text.length > best.length ? b.text : best),
              '',
            )
        }
        return majorityVote(branches, options.candidates)
      }

      return {
        abort: () => {
          aborted = true
          for (const s of sources) s?.abort()
        },
        stream: async function* () {
          const branches = await run()
          options.onBranches?.(branches)
          if (aborted) return
          const text = await finalText(branches)
          if (!text && branches.every(b => b.error)) {
            const summary = branches
              .map(b => `${b.id}: ${b.error?.message ?? 'unknown'}`)
              .join('; ')
            const err = new AdapterError({
              code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
              message: `all ensemble branches failed (${summary})`,
              hint: 'Inspect each branch error via options.onBranches or the err.branchErrors field.',
            })
            ;(err as AdapterError & { branchErrors: Array<{ id: string; error: Error | undefined }> }).branchErrors =
              branches.map(b => ({ id: b.id, error: b.error }))
            throw err
          }
          yield { type: 'text', content: text, metadata: { ensemble: branches.map(b => ({ id: b.id, bytes: b.text.length, error: b.error?.message })) } } as StreamChunk
          yield { type: 'done' } as StreamChunk
        },
      }
    },
  }
}
