import type { TokenPrice, CostGuardErrorHandler } from './cost-guard'

export type CostGuardMode = 'warn' | 'reject' | 'kill'

export interface CostCapWindow {
  /** Window length in milliseconds. */
  windowMs: number
  /** USD ceiling per window. */
  budgetUsd: number
}

export interface CostCaps {
  perMinute?: CostCapWindow
  perDay?: CostCapWindow
  perMonth?: CostCapWindow
  /** Custom additional windows. */
  custom?: Record<string, CostCapWindow>
}

export type CostAlertType =
  | 'cost:threshold'
  | 'cost:exceeded'
  | 'cost:disabled'
  | 'cost:forecast'

export interface CostAlertEvent {
  type: CostAlertType
  tenant: string
  /** Window id (`'perMinute'`, `'perDay'`, `'perMonth'`, custom name). */
  window: string
  /** ISO 8601 timestamp. */
  at: string
  /** Spend so far in this window (USD). */
  costUsd: number
  /** Cap for this window (USD). */
  budgetUsd: number
  /** Fraction of budget consumed (0–∞, always finite). */
  utilization: number
  /** Threshold that triggered this alert (`0.5`, `0.8`, `1.0`, or undefined for forecast). */
  threshold?: number
  /**
   * Estimated milliseconds until the budget is exhausted at the
   * current spend rate, when type is `'cost:forecast'`.
   */
  msUntilExceeded?: number
  /** Optional human-readable reason (mode change, etc.). */
  reason?: string
}

export type CostAlertSink = (event: CostAlertEvent) => void | Promise<void>

export interface AdvancedCostGuardOptions {
  /** Per-tenant USD budgets (overall, applied alongside windows). */
  budgets: Record<string, number>
  /** Fallback overall budget for tenants not listed. */
  defaultBudgetUsd?: number
  /** Window caps applied to every tenant. Per-tenant overrides via `tenantCaps`. */
  caps?: CostCaps
  /** Per-tenant override of `caps`. Wins over the workspace-wide `caps`. */
  tenantCaps?: Record<string, CostCaps>
  /** Active tenant resolver (same shape as `multiTenantCostGuard.tenantOf`). */
  tenantOf?: () => string | undefined
  prices?: Record<string, TokenPrice>
  /**
   * Enforcement mode (default `'warn'`). `'kill'` requires
   * `disableRuntime`.
   */
  mode?: CostGuardMode
  /**
   * Called when a tenant is disabled in `'kill'` mode. Must persist the
   * disabled state (Redis flag, DB row) so the runtime stays disabled
   * across restarts. The tenant is re-enabled only via your own
   * out-of-band call (e.g. an admin API). Failures are isolated;
   * kill state stays fail-closed disabled.
   */
  disableRuntime?: (tenant: string, reason: string) => void | Promise<void>
  /** One or more alert sinks. Fired in registration order. */
  alertSinks?: CostAlertSink[]
  /** Isolated sink for internal / callback / sink failures. */
  onError?: CostGuardErrorHandler
  modelOverride?: string
  /** Clock override for tests. Throws / non-finite values are isolated. */
  now?: () => number
  name?: string
}
