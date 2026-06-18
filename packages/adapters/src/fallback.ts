import { AdapterError, ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'

export interface FallbackOptions {
  /**
   * Predicate deciding whether an error from a given adapter should
   * trigger fall-through to the next. Default: always retry the next.
   */
  shouldRetry?: (error: Error, index: number) => boolean
  /** Observability hook — fires when one adapter fails and the chain advances. */
  onFallback?: (from: { id: string; index: number; error: Error }) => void
}

export interface FallbackCandidate {
  id: string
  adapter: AdapterFactory
}

/**
 * Try adapters in order. If the first fails (throws while opening, or
 * errors mid-stream before emitting any non-done chunk), fall through
 * to the next. As soon as a candidate produces its first real chunk,
 * that's the committed one — we don't retroactively retry mid-stream.
 *
 * Errors that happen *after* committing are propagated; the caller
 * sees a normal streaming failure, not a mysterious cross-candidate
 * retry that could duplicate tool calls.
 */
export function createFallbackAdapter(
  candidates: FallbackCandidate[],
  options: FallbackOptions = {},
): AdapterFactory {
  if (candidates.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createFallbackAdapter requires at least one candidate',
      hint: 'Pass at least one candidate, e.g. createFallbackAdapter([{ id: "primary", adapter }]).',
    })
  }

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      let active: StreamSource | undefined
      let aborted = false

      return {
        abort: () => {
          aborted = true
          active?.abort()
        },
        stream: async function* () {
          const errors: Array<{ id: string; error: Error }> = []
          for (let i = 0; i < candidates.length; i++) {
            if (aborted) return
            const candidate = candidates[i]!
            let source: StreamSource
            try {
              source = candidate.adapter.createSource(request)
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err))
              errors.push({ id: candidate.id, error })
              options.onFallback?.({ id: candidate.id, index: i, error })
              if (options.shouldRetry && !options.shouldRetry(error, i)) throw error
              continue
            }
            active = source

            // Pull until the first *committing* chunk. A throw, zero chunks, or
            // a leading `error` chunk (e.g. a 404 stale-model / 429 rate-limit
            // that the provider adapter surfaces as a chunk instead of throwing)
            // marks this candidate failed → advance to the next. Once a real
            // content chunk commits, mid-stream errors propagate (no retry).
            const iter = source.stream()[Symbol.asyncIterator]()
            let firstReal: StreamChunk | undefined
            let branchError: Error | undefined
            try {
              while (true) {
                const r = await iter.next()
                if (r.done) {
                  branchError = new Error(`candidate ${candidate.id} emitted no chunks`)
                  break
                }
                if (r.value.type === 'error') {
                  branchError = new Error(
                    `candidate ${candidate.id}: ${r.value.content ?? 'stream error'}`,
                  )
                  break
                }
                firstReal = r.value
                break
              }
            } catch (err) {
              branchError = err instanceof Error ? err : new Error(String(err))
            }

            if (branchError || !firstReal) {
              const error = branchError ?? new Error(`candidate ${candidate.id} emitted no chunks`)
              errors.push({ id: candidate.id, error })
              options.onFallback?.({ id: candidate.id, index: i, error })
              if (options.shouldRetry && !options.shouldRetry(error, i)) throw error
              active = undefined
              continue
            }

            yield firstReal
            while (true) {
              const next = await iter.next()
              if (next.done) return
              yield next.value
            }
          }
          const summary = errors.map(e => `${e.id}: ${e.error.message}`).join('; ')
          throw new AdapterError({
            code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
            message: `all fallback candidates failed (${summary})`,
            hint: 'Check each candidate adapter\'s configuration and provider keys.',
          })
        },
      }
    },
  }
}
