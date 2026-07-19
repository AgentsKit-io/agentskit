import { describe, expect, it } from 'vitest'
import { ConfigError, ErrorCodes } from '@agentskit/core'
import {
  THRESHOLDS,
  createSafeNow,
  ensureBucket,
  finiteMs,
  freshTenant,
  isValidDateEpochMs,
  pickCaps,
  rollBucket,
  shallowAlertCopy,
  validateAdvancedOptions,
  type SpendBucket,
} from '../src/cost-guard-advanced-internal'
import type { CostAlertEvent } from '../src/cost-guard-advanced-types'

const MAX_DATE_EPOCH_MS = 8.64e15

function sampleBucket(overrides: Partial<SpendBucket> = {}): SpendBucket {
  return {
    window: 'perMinute',
    start: 1_000_000,
    budgetUsd: 10,
    windowMs: 60_000,
    costUsd: 3,
    alerted: new Set([0.5]),
    forecastAlerted: true,
    ...overrides,
  }
}

describe('THRESHOLDS', () => {
  it('exposes the three utilization levels in ascending order', () => {
    expect(THRESHOLDS).toEqual([0.5, 0.8, 1.0])
  })
})

describe('freshTenant', () => {
  it('returns a zeroed tenant with empty buckets and optional model override', () => {
    const bare = freshTenant()
    expect(bare).toEqual({
      prompt: 0,
      completion: 0,
      totalCost: 0,
      model: undefined,
      exceededOverall: false,
      disabled: false,
      buckets: new Map(),
    })

    const withModel = freshTenant('gpt-4o')
    expect(withModel.model).toBe('gpt-4o')
    expect(withModel.buckets.size).toBe(0)
  })
})

describe('rollBucket', () => {
  it('leaves the bucket untouched while still inside the window', () => {
    const bucket = sampleBucket()
    rollBucket(bucket, bucket.start + 10_000)
    expect(bucket.start).toBe(1_000_000)
    expect(bucket.costUsd).toBe(3)
    expect(bucket.alerted.has(0.5)).toBe(true)
    expect(bucket.forecastAlerted).toBe(true)
  })

  it('resets spend and alert flags when the window elapses', () => {
    const bucket = sampleBucket()
    const now = bucket.start + bucket.windowMs
    rollBucket(bucket, now)
    expect(bucket.costUsd).toBe(0)
    expect(bucket.alerted.size).toBe(0)
    expect(bucket.forecastAlerted).toBe(false)
    // Aligns start to the current window grid without drifting by remainder.
    expect(bucket.start).toBe(now - (now - 1_000_000) % 60_000)
  })
})

describe('ensureBucket', () => {
  it('creates a new bucket on first access', () => {
    const state = freshTenant()
    const now = 2_000_000
    const bucket = ensureBucket(state, 'perDay', { windowMs: 86_400_000, budgetUsd: 5 }, now)
    expect(bucket.window).toBe('perDay')
    expect(bucket.start).toBe(now)
    expect(bucket.budgetUsd).toBe(5)
    expect(bucket.windowMs).toBe(86_400_000)
    expect(bucket.costUsd).toBe(0)
    expect(state.buckets.get('perDay')).toBe(bucket)
  })

  it('rolls and refreshes cap fields when the bucket already exists', () => {
    const state = freshTenant()
    const created = ensureBucket(state, 'perMinute', { windowMs: 60_000, budgetUsd: 1 }, 1_000_000)
    created.costUsd = 0.9
    created.alerted.add(0.5)

    const rolled = ensureBucket(
      state,
      'perMinute',
      { windowMs: 120_000, budgetUsd: 2 },
      1_000_000 + 70_000,
    )
    expect(rolled).toBe(created)
    expect(rolled.costUsd).toBe(0)
    expect(rolled.alerted.size).toBe(0)
    expect(rolled.budgetUsd).toBe(2)
    expect(rolled.windowMs).toBe(120_000)
  })
})

describe('validateAdvancedOptions', () => {
  it('accepts a minimal valid options object', () => {
    expect(() => validateAdvancedOptions({ budgets: {} })).not.toThrow()
    expect(() =>
      validateAdvancedOptions({
        budgets: { a: 1 },
        defaultBudgetUsd: 0,
        mode: 'warn',
        caps: {
          perMinute: { windowMs: 60_000, budgetUsd: 1 },
          custom: { hourly: { windowMs: 3_600_000, budgetUsd: 5 } },
        },
        tenantCaps: { a: { perDay: { windowMs: 86_400_000, budgetUsd: 10 } } },
        prices: { m: { input: 1, output: 2 } },
      }),
    ).not.toThrow()
  })

  it('rejects non-finite budgets, caps, prices, and unknown modes', () => {
    const cases: Array<() => void> = [
      () => validateAdvancedOptions({ budgets: { a: Number.NaN } }),
      () => validateAdvancedOptions({ budgets: {}, defaultBudgetUsd: -1 }),
      () =>
        validateAdvancedOptions({
          budgets: {},
          prices: { m: { input: -1, output: 0 } },
        }),
      () =>
        validateAdvancedOptions({
          budgets: {},
          caps: { perDay: { windowMs: 0, budgetUsd: 1 } },
        }),
      () =>
        validateAdvancedOptions({
          budgets: {},
          tenantCaps: { t: { perMonth: { windowMs: -5, budgetUsd: 1 } } },
        }),
      () =>
        validateAdvancedOptions({
          budgets: {},
          // @ts-expect-error intentional invalid mode
          mode: 'pause',
        }),
    ]
    for (const run of cases) {
      try {
        run()
        expect.unreachable('expected ConfigError')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
  })
})

describe('pickCaps', () => {
  it('merges workspace and tenant caps with tenant overrides winning', () => {
    const picked = pickCaps(
      {
        budgets: {},
        caps: {
          perMinute: { windowMs: 60_000, budgetUsd: 1 },
          perDay: { windowMs: 86_400_000, budgetUsd: 10 },
          custom: { weekly: { windowMs: 7 * 86_400_000, budgetUsd: 50 } },
        },
        tenantCaps: {
          strict: {
            perDay: { windowMs: 86_400_000, budgetUsd: 0.5 },
            perMonth: { windowMs: 30 * 86_400_000, budgetUsd: 20 },
          },
        },
      },
      'strict',
    )
    const byName = Object.fromEntries(picked)
    expect(byName.perMinute).toEqual({ windowMs: 60_000, budgetUsd: 1 })
    expect(byName.perDay).toEqual({ windowMs: 86_400_000, budgetUsd: 0.5 })
    expect(byName.perMonth).toEqual({ windowMs: 30 * 86_400_000, budgetUsd: 20 })
    expect(byName.weekly).toEqual({ windowMs: 7 * 86_400_000, budgetUsd: 50 })
  })

  it('returns an empty list when no caps are configured', () => {
    expect(pickCaps({ budgets: {} }, 'any')).toEqual([])
  })
})

describe('shallowAlertCopy', () => {
  it('returns a top-level clone that does not share mutation with the source', () => {
    const event: CostAlertEvent = {
      type: 'cost:threshold',
      tenant: 't1',
      window: 'perDay',
      at: '2026-01-01T00:00:00.000Z',
      costUsd: 0.5,
      budgetUsd: 1,
      utilization: 0.5,
      threshold: 0.5,
    }
    const copy = shallowAlertCopy(event)
    expect(copy).toEqual(event)
    expect(copy).not.toBe(event)
    copy.utilization = Number.POSITIVE_INFINITY
    expect(event.utilization).toBe(0.5)
  })
})

describe('finiteMs / isValidDateEpochMs', () => {
  it('finiteMs coerces non-finite values to zero', () => {
    expect(finiteMs(42)).toBe(42)
    expect(finiteMs(Number.NaN)).toBe(0)
    expect(finiteMs(Number.POSITIVE_INFINITY)).toBe(0)
    expect(finiteMs(Number.NEGATIVE_INFINITY)).toBe(0)
  })

  it('isValidDateEpochMs accepts ECMAScript Date range only', () => {
    expect(isValidDateEpochMs(0)).toBe(true)
    expect(isValidDateEpochMs(Date.now())).toBe(true)
    expect(isValidDateEpochMs(MAX_DATE_EPOCH_MS)).toBe(true)
    expect(isValidDateEpochMs(-MAX_DATE_EPOCH_MS)).toBe(true)
    expect(isValidDateEpochMs(MAX_DATE_EPOCH_MS + 1)).toBe(false)
    expect(isValidDateEpochMs(Number.MAX_VALUE)).toBe(false)
    expect(isValidDateEpochMs(Number.NaN)).toBe(false)
    expect(isValidDateEpochMs(Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('createSafeNow', () => {
  it('returns valid clock values and caches the last good reading', () => {
    const errors: unknown[] = []
    let tick = 0
    const safeNow = createSafeNow(
      () => {
        tick += 1
        if (tick === 1) return 1_000_000
        if (tick === 2) throw new Error('clock throw')
        if (tick === 3) return Number.NaN
        if (tick === 4) return Number.MAX_VALUE
        return 2_000_000
      },
      (error) => {
        errors.push(error)
      },
      (onError, error) => {
        onError?.(error)
      },
    )

    expect(safeNow()).toBe(1_000_000)
    // throw → last valid
    expect(safeNow()).toBe(1_000_000)
    // NaN → last valid
    expect(safeNow()).toBe(1_000_000)
    // finite but out of Date range → last valid
    expect(safeNow()).toBe(1_000_000)
    expect(safeNow()).toBe(2_000_000)
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })

  it('falls back to wall clock when no valid reading has been seen yet', () => {
    const errors: unknown[] = []
    const before = Date.now()
    const safeNow = createSafeNow(
      () => Number.NaN,
      (error) => {
        errors.push(error)
      },
      (onError, error) => {
        onError?.(error)
      },
    )
    const value = safeNow()
    const after = Date.now()
    expect(value).toBeGreaterThanOrEqual(before)
    expect(value).toBeLessThanOrEqual(after)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })
})
