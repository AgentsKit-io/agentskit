import { createPIIRedactor, type PIIRule } from '@agentskit/core/security'
import type { Validator, ValidatorAction } from './validator-guard'

/**
 * A `Validator` that FAILS when the agent's output still contains PII — the bridge
 * between `@agentskit/core/security`'s redactor and the `createValidatorGuard` chain.
 * Use it as a deterministic last-line gate on agents that must not leak PII
 * (redaction, summarization, anything exporting cross-tenant), instead of trusting
 * the system prompt to do it.
 *
 * ```ts
 * import { createValidatorGuard, piiDenyValidator } from '@agentskit/runtime'
 * const guard = createValidatorGuard({ validators: [piiDenyValidator()] })
 * ```
 *
 * Default `onFail: 'block'` — a PII leak is not something to silently retry past.
 */
export function piiDenyValidator(
  opts: { rules?: PIIRule[]; name?: string; onFail?: ValidatorAction } = {},
): Validator {
  const redactor = createPIIRedactor({ rules: opts.rules })
  return {
    name: opts.name ?? 'pii-deny',
    check: ({ output }) => {
      const { hits } = redactor.redact(output)
      if (hits.length === 0) return { ok: true }
      const summary = hits.map((h) => `${h.rule}×${h.count}`).join(', ')
      return { ok: false, reason: `output contains PII (${summary})` }
    },
    onFail: opts.onFail ?? 'block',
  }
}
