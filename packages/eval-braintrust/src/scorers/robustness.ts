import type { Scorer } from '../types'

/** Optional schema validation fields read by {@link schemaSurvival}. */
export interface SchemaValidityMeta {
  schemaValid?: boolean
  parseError?: string | null
}

/** Score whether metadata reports a valid schema and no parse error.
 *
 * @param args Scorer input with schema validity metadata.
 * @returns One unless metadata reports an invalid schema or parse error.
 */
export const schemaSurvival: Scorer<unknown, SchemaValidityMeta> = ({ metadata }) => {
  const valid = metadata?.schemaValid !== false && !metadata?.parseError
  return {
    name: 'schema_survival',
    score: valid ? 1 : 0,
    rationale: metadata?.parseError ?? undefined,
  }
}

/** Optional expected and observed human-in-the-loop gate fields. */
export interface HitlMeta {
  hitlExpected?: boolean
  hitlTriggered?: boolean
}

/** Score whether the human-in-the-loop gate matched the expected trigger state.
 *
 * @param args Scorer input with expected and observed HITL metadata.
 * @returns One when the states match, otherwise zero.
 */
export const hitlGateCorrectness: Scorer<unknown, HitlMeta> = ({ metadata }) => {
  const expected = metadata?.hitlExpected ?? false
  const triggered = metadata?.hitlTriggered ?? false
  if (expected === triggered) return { name: 'hitl_gate_correctness', score: 1 }
  return {
    name: 'hitl_gate_correctness',
    score: 0,
    rationale: expected ? 'expected HITL but not triggered' : 'unexpected HITL trigger',
  }
}

/** Optional primary error and fallback status fields. */
export interface FallbackMeta {
  primaryError?: string | null
  fallbackFired?: boolean
}

/** Score whether a failed primary attempt was recovered by a fallback.
 *
 * @param args Scorer input with primary-error and fallback metadata.
 * @returns One for a clean run or fired fallback, and zero for an uncovered primary error.
 */
export const fallbackResilience: Scorer<unknown, FallbackMeta> = ({ metadata }) => {
  const errored = Boolean(metadata?.primaryError)
  const fallback = Boolean(metadata?.fallbackFired)
  if (!errored && !fallback) return { name: 'fallback_resilience', score: 1, rationale: 'no errors' }
  if (errored && fallback) return { name: 'fallback_resilience', score: 1, rationale: 'fallback recovered' }
  if (!errored && fallback) {
    return { name: 'fallback_resilience', score: 1, rationale: 'fallback fired (no primary error — defensive)' }
  }
  return { name: 'fallback_resilience', score: 0, rationale: 'primary errored, no fallback' }
}

/** Optional crash signal fields read by {@link noCrashSurvival}. */
export interface CrashMeta {
  crashed?: boolean
  uncaughtException?: string | null
}

/** Score whether metadata reports a crash or uncaught exception.
 *
 * @param args Scorer input with crash metadata.
 * @returns Zero for a crash signal, otherwise one.
 */
export const noCrashSurvival: Scorer<unknown, CrashMeta> = ({ metadata }) => {
  const crashed = metadata?.crashed === true || Boolean(metadata?.uncaughtException)
  return {
    name: 'no_crash_survival',
    score: crashed ? 0 : 1,
    rationale: crashed ? (metadata?.uncaughtException ?? 'crashed') : undefined,
  }
}
