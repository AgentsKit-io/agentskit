/**
 * Validator guarantee — the "agent insurance" primitive. Wraps any
 * regenerable agent output with a validator chain. If a validator
 * fails, the guard either retries (with optional repair feedback),
 * blocks (returns a deterministic fallback), or falls back to a
 * pre-canned safe answer. Every decision is auditable.
 *
 * Use cases:
 *   - JSON-shape contracts on tool inputs / structured outputs.
 *   - "Never emit PII" final-output gate.
 *   - "Answer must cite at least one source from the corpus" guarantee.
 *   - SOX / HIPAA / fair-housing safety rails.
 *
 * The guard is provider- and adapter-agnostic — pass any
 * `() => Promise<string>` regenerator. Designed to layer on top of
 * `@agentskit/eval` validators (a deterministic eval is just a
 * `Validator` whose `check` returns true/false).
 *
 * Closes issue #210.
 */

export type ValidatorAction = 'retry' | 'block' | 'fallback'

export interface ValidatorCheckContext {
  /** Attempt index (0-based) for the current run. */
  attempt: number
  /** Output being validated. */
  output: string
}

export interface Validator {
  /** Stable id for audit logs / dashboards. */
  name: string
  /**
   * Return `true` (or a `{ ok: true }` object) when the output passes.
   * Return `false` (or `{ ok: false, reason }`) to fail.
   *
   * Async checks are supported — useful for eval LLM-judge or RAG
   * citation lookups.
   */
  check: (ctx: ValidatorCheckContext) => ValidatorResult | Promise<ValidatorResult>
  /** What to do on failure. Default `'retry'` (with up to maxRetries). */
  onFail?: ValidatorAction
  /** Cap retries per run. Default 1. */
  maxRetries?: number
  /**
   * Repair instruction appended to the regenerator on retry. Lets the
   * agent self-correct. Receives the failure context.
   */
  repairPrompt?: (ctx: { output: string; reason?: string }) => string
}

export type ValidatorResult = boolean | { ok: boolean; reason?: string }

export interface ValidatorGuardOptions {
  validators: Validator[]
  /** Deterministic fallback text used when `onFail: 'fallback'` fires. */
  fallback?: string
  /** Audit hook — receives every accepted, retried, or blocked decision. */
  audit?: (event: ValidatorAuditEvent) => void
}

export interface ValidatorAuditEvent {
  /** ISO timestamp. */
  at: string
  /** Outcome of the run. */
  outcome: 'accepted' | 'blocked' | 'fallback'
  /** Total attempts made. */
  attempts: number
  /** Per-failure detail. Empty when `outcome: 'accepted'` on first try. */
  failures: Array<{ validator: string; attempt: number; reason?: string; action: ValidatorAction }>
  /** Final output that left the guard. */
  output: string
}

export interface ValidatorGuardRun {
  /** Output that survived the gauntlet (or the fallback). */
  output: string
  /** True when a validator chain accepted; false when blocked / fallback. */
  accepted: boolean
  /** Total attempts made. */
  attempts: number
  failures: Array<{ validator: string; attempt: number; reason?: string; action: ValidatorAction }>
}

export interface ValidatorGuardRunOptions {
  /** Regenerate the output. Receives the optional repair prompt. */
  regenerate: (repair?: string) => Promise<string>
  /** Initial output to validate (skips first regenerate call). */
  seed?: string
}

export interface ValidatorGuard {
  run: (options: ValidatorGuardRunOptions) => Promise<ValidatorGuardRun>
}

function normaliseResult(value: ValidatorResult): { ok: boolean; reason?: string } {
  if (typeof value === 'boolean') return { ok: value }
  return value
}

export function createValidatorGuard(options: ValidatorGuardOptions): ValidatorGuard {
  return {
    async run({ regenerate, seed }) {
      const failures: ValidatorGuardRun['failures'] = []
      let output = seed ?? (await regenerate())
      let attempts = 1

      // Each validator gets its own retry budget so a flaky JSON gate
      // doesn't burn the budget that a strict PII gate also needs.
      for (const validator of options.validators) {
        const action = validator.onFail ?? 'retry'
        const maxRetries = validator.maxRetries ?? 1
        let retries = 0
        // Re-check the current output. On failure, decide.
        while (true) {
          const result = normaliseResult(
            await validator.check({ attempt: attempts - 1, output }),
          )
          if (result.ok) break

          failures.push({
            validator: validator.name,
            attempt: attempts - 1,
            reason: result.reason,
            action,
          })

          if (action === 'block') {
            const event: ValidatorAuditEvent = {
              at: new Date().toISOString(),
              outcome: 'blocked',
              attempts,
              failures,
              output: '',
            }
            options.audit?.(event)
            return { output: '', accepted: false, attempts, failures }
          }
          if (action === 'fallback') {
            const finalOutput = options.fallback ?? ''
            const event: ValidatorAuditEvent = {
              at: new Date().toISOString(),
              outcome: 'fallback',
              attempts,
              failures,
              output: finalOutput,
            }
            options.audit?.(event)
            return { output: finalOutput, accepted: false, attempts, failures }
          }
          // retry
          if (retries >= maxRetries) {
            // Out of retries — escalate to fallback if configured, else block.
            if (options.fallback != null) {
              const event: ValidatorAuditEvent = {
                at: new Date().toISOString(),
                outcome: 'fallback',
                attempts,
                failures,
                output: options.fallback,
              }
              options.audit?.(event)
              return { output: options.fallback, accepted: false, attempts, failures }
            }
            const event: ValidatorAuditEvent = {
              at: new Date().toISOString(),
              outcome: 'blocked',
              attempts,
              failures,
              output: '',
            }
            options.audit?.(event)
            return { output: '', accepted: false, attempts, failures }
          }
          const repair = validator.repairPrompt?.({ output, reason: result.reason })
          output = await regenerate(repair)
          attempts += 1
          retries += 1
        }
      }

      const event: ValidatorAuditEvent = {
        at: new Date().toISOString(),
        outcome: 'accepted',
        attempts,
        failures,
        output,
      }
      options.audit?.(event)
      return { output, accepted: true, attempts, failures }
    },
  }
}

// ---------------------------------------------------------------------------
// Built-in validators
// ---------------------------------------------------------------------------

/** Regex-deny validator. Fails when the pattern matches. */
export function denyPattern(pattern: RegExp, name = 'deny-pattern'): Validator {
  return {
    name,
    check: ({ output }) => {
      if (pattern.test(output)) return { ok: false, reason: `output matched deny pattern ${pattern}` }
      return true
    },
    onFail: 'block',
  }
}

/** Length-bounds validator. Useful for token-budget guarantees. */
export function lengthRange(options: { min?: number; max?: number; name?: string }): Validator {
  return {
    name: options.name ?? 'length-range',
    check: ({ output }) => {
      if (options.min != null && output.length < options.min) return { ok: false, reason: `length ${output.length} < min ${options.min}` }
      if (options.max != null && output.length > options.max) return { ok: false, reason: `length ${output.length} > max ${options.max}` }
      return true
    },
    onFail: 'retry',
  }
}

/** JSON-parse validator. Fails when the output is not valid JSON. */
export function isJson(options: { name?: string; maxRetries?: number; repairPrompt?: string } = {}): Validator {
  return {
    name: options.name ?? 'is-json',
    check: ({ output }) => {
      try {
        JSON.parse(output)
        return true
      } catch (err) {
        return { ok: false, reason: (err as Error).message }
      }
    },
    onFail: 'retry',
    maxRetries: options.maxRetries ?? 2,
    repairPrompt: () => options.repairPrompt ?? 'Your previous response was not valid JSON. Reply with strict JSON only — no markdown fences, no commentary.',
  }
}
