import { AdapterError } from '@agentskit/core'

/** Stable codes of the gateway cap errors. */
export const GatewayErrorCodes = {
  AK_GATEWAY_CALL_CAP_EXCEEDED: 'AK_GATEWAY_CALL_CAP_EXCEEDED',
  AK_GATEWAY_BUDGET_EXCEEDED: 'AK_GATEWAY_BUDGET_EXCEEDED',
} as const

/** Raised when a call exceeds its per-call cap or its named budget (USD). */
export class GatewayCapError extends AdapterError {
  readonly kind: 'per-call' | 'budget'
  readonly limitUsd: number
  /** Cost (per-call) or cumulative spend including this call (budget). */
  readonly actualUsd: number
  readonly budget: string | undefined

  constructor(options: { kind: 'per-call' | 'budget'; limitUsd: number; actualUsd: number; budget?: string }) {
    const { kind, limitUsd, actualUsd, budget } = options
    super({
      code:
        kind === 'per-call'
          ? GatewayErrorCodes.AK_GATEWAY_CALL_CAP_EXCEEDED
          : GatewayErrorCodes.AK_GATEWAY_BUDGET_EXCEEDED,
      message:
        kind === 'per-call'
          ? `Call cost $${actualUsd} exceeds the per-call cap of $${limitUsd}.`
          : `Budget "${budget}" at $${actualUsd} exceeds its cap of $${limitUsd}.`,
      hint: 'Raise the cap in the gateway config or use a cheaper model.',
    })
    this.name = 'GatewayCapError'
    this.kind = kind
    this.limitUsd = limitUsd
    this.actualUsd = actualUsd
    this.budget = budget
  }
}
