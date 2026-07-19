import { ConfigError, ErrorCodes } from '@agentskit/core'
import {
  assertFiniteNonNegative,
  assertFinitePositive,
  validateTokenPrices,
} from './cost-guard'
import type {
  AdvancedCostGuardOptions,
  CostAlertEvent,
  CostCapWindow,
  CostCaps,
} from './cost-guard-advanced-types'

export interface SpendBucket {
  window: string
  start: number
  budgetUsd: number
  windowMs: number
  costUsd: number
  alerted: Set<number>
  forecastAlerted: boolean
}

export interface TenantState {
  prompt: number
  completion: number
  totalCost: number
  model: string | undefined
  exceededOverall: boolean
  disabled: boolean
  buckets: Map<string, SpendBucket>
}

export const THRESHOLDS = [0.5, 0.8, 1.0] as const
const VALID_MODES: ReadonlySet<string> = new Set(['warn', 'reject', 'kill'])
/** ECMAScript Date time value range; outside this, `toISOString()` throws. */
const MAX_DATE_EPOCH_MS = 8.64e15

export function freshTenant(modelOverride?: string): TenantState {
  return {
    prompt: 0,
    completion: 0,
    totalCost: 0,
    model: modelOverride,
    exceededOverall: false,
    disabled: false,
    buckets: new Map(),
  }
}

export function rollBucket(bucket: SpendBucket, now: number): void {
  if (now >= bucket.start + bucket.windowMs) {
    bucket.start = now - (now - bucket.start) % bucket.windowMs
    bucket.costUsd = 0
    bucket.alerted.clear()
    bucket.forecastAlerted = false
  }
}

export function ensureBucket(
  state: TenantState,
  windowId: string,
  cap: CostCapWindow,
  now: number,
): SpendBucket {
  let bucket = state.buckets.get(windowId)
  if (!bucket) {
    bucket = {
      window: windowId,
      start: now,
      budgetUsd: cap.budgetUsd,
      windowMs: cap.windowMs,
      costUsd: 0,
      alerted: new Set(),
      forecastAlerted: false,
    }
    state.buckets.set(windowId, bucket)
  } else {
    rollBucket(bucket, now)
    bucket.budgetUsd = cap.budgetUsd
    bucket.windowMs = cap.windowMs
  }
  return bucket
}

function validateCapWindow(scope: string, path: string, cap: CostCapWindow): void {
  assertFiniteNonNegative(scope, `${path}.budgetUsd`, cap.budgetUsd)
  assertFinitePositive(scope, `${path}.windowMs`, cap.windowMs)
}

function validateCaps(scope: string, path: string, caps: CostCaps | undefined): void {
  if (!caps) return
  if (caps.perMinute) validateCapWindow(scope, `${path}.perMinute`, caps.perMinute)
  if (caps.perDay) validateCapWindow(scope, `${path}.perDay`, caps.perDay)
  if (caps.perMonth) validateCapWindow(scope, `${path}.perMonth`, caps.perMonth)
  if (caps.custom) {
    for (const [name, cap] of Object.entries(caps.custom)) {
      validateCapWindow(scope, `${path}.custom['${name}']`, cap)
    }
  }
}

export function validateAdvancedOptions(options: AdvancedCostGuardOptions): void {
  const scope = 'createAdvancedCostGuard'
  for (const [tenant, budget] of Object.entries(options.budgets)) {
    assertFiniteNonNegative(scope, `budgets['${tenant}']`, budget)
  }
  if (options.defaultBudgetUsd !== undefined) {
    assertFiniteNonNegative(scope, 'defaultBudgetUsd', options.defaultBudgetUsd)
  }
  validateTokenPrices(scope, options.prices)
  validateCaps(scope, 'caps', options.caps)
  if (options.tenantCaps) {
    for (const [tenant, caps] of Object.entries(options.tenantCaps)) {
      validateCaps(scope, `tenantCaps['${tenant}']`, caps)
    }
  }
  if (options.mode !== undefined && !VALID_MODES.has(options.mode)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${scope}: mode must be "warn" | "reject" | "kill" (received ${String(options.mode)})`,
      hint: 'Use one of the three supported enforcement modes.',
    })
  }
}

export function pickCaps(
  options: AdvancedCostGuardOptions,
  tenant: string,
): Array<[string, CostCapWindow]> {
  const merged: CostCaps = { ...(options.caps ?? {}), ...(options.tenantCaps?.[tenant] ?? {}) }
  const out: Array<[string, CostCapWindow]> = []
  if (merged.perMinute) out.push(['perMinute', merged.perMinute])
  if (merged.perDay) out.push(['perDay', merged.perDay])
  if (merged.perMonth) out.push(['perMonth', merged.perMonth])
  if (merged.custom) {
    for (const [name, cap] of Object.entries(merged.custom)) out.push([name, cap])
  }
  return out
}

export function shallowAlertCopy(event: CostAlertEvent): CostAlertEvent {
  return { ...event }
}

export function finiteMs(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function isValidDateEpochMs(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MAX_DATE_EPOCH_MS
}

export function createSafeNow(
  clock: () => number,
  onError: ((error: unknown) => void | Promise<void>) | undefined,
  report: (onError: ((error: unknown) => void | Promise<void>) | undefined, error: unknown) => void,
): () => number {
  let lastValidNow: number | undefined

  const validatedWallClock = (): number => {
    const real = Date.now()
    if (isValidDateEpochMs(real)) {
      lastValidNow = real
      return real
    }
    lastValidNow = 0
    return 0
  }

  return (): number => {
    try {
      const t = clock()
      if (isValidDateEpochMs(t)) {
        lastValidNow = t
        return t
      }
      report(
        onError,
        new Error(`createAdvancedCostGuard: now() returned invalid epoch (${String(t)})`),
      )
    } catch (err) {
      report(onError, err)
    }
    if (lastValidNow !== undefined) return lastValidNow
    return validatedWallClock()
  }
}
