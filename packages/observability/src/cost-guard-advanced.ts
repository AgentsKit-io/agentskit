import { ConfigError, ErrorCodes, type AgentEvent, type Observer } from '@agentskit/core'
import {
  DEFAULT_PRICES,
  computeCost,
  priceFor,
  normalizeTokenCount,
  finiteUtilization,
  reportCostGuardError,
} from './cost-guard'
import type {
  AdvancedCostGuardOptions,
  CostAlertEvent,
  CostGuardMode,
} from './cost-guard-advanced-types'
import {
  THRESHOLDS,
  createSafeNow,
  ensureBucket,
  finiteMs,
  freshTenant,
  pickCaps,
  rollBucket,
  shallowAlertCopy,
  validateAdvancedOptions,
  type TenantState,
} from './cost-guard-advanced-internal'

export type {
  CostGuardMode,
  CostCapWindow,
  CostCaps,
  CostAlertType,
  CostAlertEvent,
  CostAlertSink,
  AdvancedCostGuardOptions,
} from './cost-guard-advanced-types'

export {
  consoleAlertSink,
  webhookAlertSink,
  throttle,
} from './cost-guard-alert-sinks'
export type { WebhookAlertSinkOptions } from './cost-guard-alert-sinks'

/**
 * Production-grade cost guard. Extends the multi-tenant guard with modes
 * (`warn` / `reject` / `kill`), rolling window caps, threshold + forecast
 * alerts, and pluggable sinks. Closes #787–#789.
 */

export interface AdvancedCostGuard extends Observer {
  setTenant: (tenant: string | undefined) => void
  costUsd: (tenant: string) => number
  windowSpend: (tenant: string, window: string) => number | undefined
  isDisabled: (tenant: string) => boolean
  /**
   * Reject mode only: true when this tenant has tripped the overall budget
   * or an active window's 100% cap. Window-only rejections clear when the
   * window rolls; overall rejections last until `reset`. Always false in
   * `warn` / `kill` modes.
   */
  isRejected: (tenant: string) => boolean
  /** Re-enable a tenant disabled by `kill` mode. Caller must also clear the persisted flag. */
  enable: (tenant: string) => void
  reset: (tenant?: string) => void
  tenants: () => string[]
}

export function createAdvancedCostGuard(
  options: AdvancedCostGuardOptions,
): AdvancedCostGuard {
  validateAdvancedOptions(options)

  if (options.mode === 'kill' && !options.disableRuntime) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createAdvancedCostGuard: mode "kill" requires disableRuntime callback',
      hint: 'Provide a function that persists the disabled flag (Redis, DB, KV).',
    })
  }
  const mode: CostGuardMode = options.mode ?? 'warn'
  const mergedPrices = options.prices ? { ...DEFAULT_PRICES, ...options.prices } : DEFAULT_PRICES
  const clock = options.now ?? Date.now
  const onError = options.onError
  const tenants = new Map<string, TenantState>()
  let activeTenant: string | undefined
  const safeNow = createSafeNow(clock, onError, reportCostGuardError)

  const fireAlert = async (event: CostAlertEvent): Promise<void> => {
    for (const sink of options.alertSinks ?? []) {
      const copy = shallowAlertCopy(event)
      try {
        await sink(copy)
      } catch (err) {
        reportCostGuardError(onError, err)
      }
    }
  }

  const overallBudget = (tenant: string): number | undefined => {
    return options.budgets[tenant] ?? options.defaultBudgetUsd
  }

  const stateOf = (tenant: string): TenantState => {
    let state = tenants.get(tenant)
    if (!state) {
      state = freshTenant(options.modelOverride)
      tenants.set(tenant, state)
    }
    return state
  }

  const resolveTenant = (): string | undefined => {
    if (!options.tenantOf) return activeTenant
    try {
      return options.tenantOf() ?? activeTenant
    } catch (err) {
      reportCostGuardError(onError, err)
      return activeTenant
    }
  }

  /**
   * Synchronously update state + bucket counters and decide which alerts must
   * fire. Keeps concurrency-safe totals before any async sink work.
   */
  const recordSpend = (
    tenant: string,
    state: TenantState,
    deltaCost: number,
  ): { alerts: CostAlertEvent[]; disable?: { reason: string } } => {
    state.totalCost += deltaCost
    const t = safeNow()
    const alerts: CostAlertEvent[] = []

    const caps = pickCaps(options, tenant)
    for (const [windowId, cap] of caps) {
      const bucket = ensureBucket(state, windowId, cap, t)
      bucket.costUsd += deltaCost
      const utilization = finiteUtilization(bucket.costUsd, bucket.budgetUsd)
      for (const threshold of THRESHOLDS) {
        if (utilization >= threshold && !bucket.alerted.has(threshold)) {
          bucket.alerted.add(threshold)
          alerts.push({
            type: threshold === 1.0 ? 'cost:exceeded' : 'cost:threshold',
            tenant,
            window: windowId,
            at: new Date(t).toISOString(),
            costUsd: bucket.costUsd,
            budgetUsd: bucket.budgetUsd,
            utilization,
            threshold,
          })
        }
      }
      const elapsed = t - bucket.start
      if (
        !bucket.forecastAlerted &&
        elapsed > 0 &&
        elapsed < bucket.windowMs &&
        elapsed > bucket.windowMs * 0.25 &&
        utilization > 0
      ) {
        const projectedFinal = (bucket.costUsd / elapsed) * bucket.windowMs
        if (projectedFinal > bucket.budgetUsd) {
          bucket.forecastAlerted = true
          const remaining = bucket.budgetUsd - bucket.costUsd
          const rate = bucket.costUsd / elapsed
          const msUntilExceeded = remaining > 0 && rate > 0 ? remaining / rate : 0
          alerts.push({
            type: 'cost:forecast',
            tenant,
            window: windowId,
            at: new Date(t).toISOString(),
            costUsd: bucket.costUsd,
            budgetUsd: bucket.budgetUsd,
            utilization,
            msUntilExceeded: finiteMs(msUntilExceeded),
          })
        }
      }
    }

    const overall = overallBudget(tenant)
    if (overall !== undefined && state.totalCost > overall && !state.exceededOverall) {
      state.exceededOverall = true
      alerts.push({
        type: 'cost:exceeded',
        tenant,
        window: 'overall',
        at: new Date(t).toISOString(),
        costUsd: state.totalCost,
        budgetUsd: overall,
        utilization: finiteUtilization(state.totalCost, overall),
        threshold: 1.0,
      })
    }

    const tripped =
      state.exceededOverall ||
      Array.from(state.buckets.values()).some(b => b.alerted.has(1.0))
    let disable: { reason: string } | undefined
    if (mode === 'kill' && tripped && !state.disabled) {
      state.disabled = true
      const reason = state.exceededOverall
        ? `overall budget exceeded ($${overall} cap)`
        : 'window cap exceeded'
      disable = { reason }
      alerts.push({
        type: 'cost:disabled',
        tenant,
        window: 'overall',
        at: new Date(t).toISOString(),
        costUsd: state.totalCost,
        budgetUsd: overall ?? 0,
        utilization: overall !== undefined
          ? finiteUtilization(state.totalCost, overall)
          : finiteUtilization(state.totalCost, 0),
        reason,
      })
    }

    return { alerts, disable }
  }

  const dispatchAlerts = async (
    tenant: string,
    alerts: CostAlertEvent[],
    disable?: { reason: string },
  ): Promise<void> => {
    for (const event of alerts) await fireAlert(event)
    if (disable && options.disableRuntime) {
      try {
        await options.disableRuntime(tenant, disable.reason)
      } catch (err) {
        reportCostGuardError(onError, err)
      }
    }
  }

  return {
    name: options.name ?? 'cost-guard-advanced',
    on(event: AgentEvent) {
      const tenant = resolveTenant()
      if (!tenant) return
      const state = stateOf(tenant)
      if (state.disabled && mode === 'kill') return
      if (event.type === 'llm:start' && event.model && !options.modelOverride) {
        state.model = event.model
      }
      if (event.type === 'llm:end' && event.usage) {
        const deltaPrompt = normalizeTokenCount(event.usage.promptTokens)
        const deltaCompletion = normalizeTokenCount(event.usage.completionTokens)
        state.prompt += deltaPrompt
        state.completion += deltaCompletion
        const price = priceFor(state.model, mergedPrices)
        const delta = computeCost(
          { promptTokens: deltaPrompt, completionTokens: deltaCompletion },
          price,
        )
        if (delta > 0) {
          const { alerts, disable } = recordSpend(tenant, state, delta)
          if (alerts.length > 0 || disable) {
            void dispatchAlerts(tenant, alerts, disable).then(undefined, (err: unknown) => {
              reportCostGuardError(onError, err)
            })
          }
        }
      }
    },
    setTenant(tenant) {
      activeTenant = tenant
    },
    costUsd: (tenant) => stateOf(tenant).totalCost,
    windowSpend: (tenant, window) => stateOf(tenant).buckets.get(window)?.costUsd,
    isDisabled: (tenant) => stateOf(tenant).disabled,
    isRejected: (tenant) => {
      if (mode !== 'reject') return false
      try {
        const state = tenants.get(tenant)
        if (!state) return false
        if (state.exceededOverall) return true
        const t = safeNow()
        const caps = pickCaps(options, tenant)
        for (const [windowId, cap] of caps) {
          const bucket = state.buckets.get(windowId)
          if (!bucket) continue
          rollBucket(bucket, t)
          bucket.budgetUsd = cap.budgetUsd
          bucket.windowMs = cap.windowMs
          if (bucket.alerted.has(1.0)) return true
          if (finiteUtilization(bucket.costUsd, bucket.budgetUsd) >= 1) return true
        }
        return false
      } catch (err) {
        reportCostGuardError(onError, err)
        return false
      }
    },
    enable: (tenant) => {
      const state = stateOf(tenant)
      state.disabled = false
    },
    reset(tenant) {
      if (tenant) tenants.set(tenant, freshTenant(options.modelOverride))
      else tenants.clear()
    },
    tenants: () => Array.from(tenants.keys()),
  }
}
