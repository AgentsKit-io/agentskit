import { describe, it, expect, vi } from 'vitest'
import { ConfigError, ErrorCodes } from '@agentskit/core'
import { multiTenantCostGuard } from '../src/cost-guard-multi-tenant'

const flush = () => new Promise<void>((r) => setImmediate(r))

async function expectNoUnhandledRejection(fn: () => void | Promise<void>): Promise<void> {
  const rejections: unknown[] = []
  const onUR = (reason: unknown) => {
    rejections.push(reason)
  }
  process.on('unhandledRejection', onUR)
  try {
    await fn()
    await flush()
    await flush()
    expect(rejections).toEqual([])
  } finally {
    process.off('unhandledRejection', onUR)
  }
}

function make(opts: Partial<Parameters<typeof multiTenantCostGuard>[0]> = {}) {
  return multiTenantCostGuard({
    budgets: { 'tenant-a': 0.01, 'tenant-b': 1 },
    ...opts,
  })
}

const start = (model: string) => ({
  type: 'llm:start' as const,
  spanId: 's1',
  parentSpanId: undefined,
  model,
  attributes: {},
  startTime: 0,
})

const end = (promptTokens: number, completionTokens: number) => ({
  type: 'llm:end' as const,
  spanId: 's1',
  content: 'x',
  usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
  attributes: {},
  startTime: 0,
  endTime: 1,
})

describe('multiTenantCostGuard', () => {
  it('partitions usage by tenant', () => {
    const guard = make()
    guard.setTenant('tenant-a')
    guard.on(start('gpt-4o'))
    guard.on(end(1000, 500))
    guard.setTenant('tenant-b')
    guard.on(start('gpt-4o'))
    guard.on(end(2000, 1000))
    expect(guard.promptTokens('tenant-a')).toBe(1000)
    expect(guard.promptTokens('tenant-b')).toBe(2000)
    expect(guard.tenants().sort()).toEqual(['tenant-a', 'tenant-b'])
  })

  it('fires onExceeded once per tenant when its budget is breached', () => {
    const onExceeded = vi.fn()
    const guard = make({ onExceeded })
    guard.setTenant('tenant-a')
    guard.on(start('gpt-4o'))
    guard.on(end(10_000, 5_000))   // 0.025 + 0.05 = 0.075 USD > 0.01
    expect(guard.exceeded('tenant-a')).toBe(true)
    expect(onExceeded).toHaveBeenCalledTimes(1)
    // additional events do not re-fire
    guard.on(start('gpt-4o'))
    guard.on(end(1, 1))
    expect(onExceeded).toHaveBeenCalledTimes(1)
  })

  it('does not abort the runtime — emission is up to the caller', () => {
    const guard = make()
    guard.setTenant('tenant-a')
    guard.on(start('gpt-4o'))
    guard.on(end(10_000, 10_000))
    expect(guard.exceeded('tenant-a')).toBe(true)
  })

  it('uses defaultBudgetUsd when tenant is unlisted', () => {
    const onExceeded = vi.fn()
    const guard = multiTenantCostGuard({
      budgets: {},
      defaultBudgetUsd: 0.001,
      onExceeded,
    })
    guard.setTenant('walk-in')
    guard.on(start('gpt-4o'))
    guard.on(end(1000, 500))
    expect(onExceeded).toHaveBeenCalledTimes(1)
    expect(guard.budgetFor('walk-in')).toBe(0.001)
  })

  it('skips metering entirely when no tenant is set', () => {
    const guard = make()
    guard.on(start('gpt-4o'))
    guard.on(end(1000, 500))
    expect(guard.tenants()).toEqual([])
  })

  it('reset(tenant) clears one bucket, reset() clears all', () => {
    const guard = make()
    guard.setTenant('tenant-a')
    guard.on(start('gpt-4o'))
    guard.on(end(1000, 500))
    guard.setTenant('tenant-b')
    guard.on(start('gpt-4o'))
    guard.on(end(1000, 500))
    guard.reset('tenant-a')
    expect(guard.costUsd('tenant-a')).toBe(0)
    expect(guard.costUsd('tenant-b')).toBeGreaterThan(0)
    guard.reset()
    expect(guard.costUsd('tenant-b')).toBe(0)
  })

  it('tenantOf resolver overrides setTenant', () => {
    let externalTenant: string | undefined = 'tenant-b'
    const guard = multiTenantCostGuard({
      budgets: { 'tenant-b': 1 },
      tenantOf: () => externalTenant,
    })
    guard.setTenant('ignored')
    guard.on(start('gpt-4o'))
    guard.on(end(1000, 500))
    expect(guard.promptTokens('tenant-b')).toBe(1000)
    expect(guard.tenants()).toEqual(['tenant-b'])
    externalTenant = undefined
    guard.on(start('gpt-4o'))
    guard.on(end(99, 99))   // skipped
    expect(guard.promptTokens('tenant-b')).toBe(1000)
  })

  it('mixed-model accounting is incremental per tenant/model', () => {
    const guard = multiTenantCostGuard({
      budgets: { a: 1000 },
      prices: {
        cheap: { input: 1, output: 0 },
        expensive: { input: 100, output: 0 },
      },
    })
    guard.setTenant('a')
    guard.on(start('cheap'))
    guard.on(end(1000, 0)) // $1
    guard.on(start('expensive'))
    guard.on(end(1000, 0)) // +$100
    expect(guard.promptTokens('a')).toBe(2000)
    expect(guard.costUsd('a')).toBeCloseTo(101, 6)
  })

  it('normalizes hostile usage without poisoning tenant cost/state/JSON', () => {
    const onCost = vi.fn()
    const guard = multiTenantCostGuard({
      budgets: { a: 10 },
      prices: { m: { input: 1, output: 1 } },
      modelOverride: 'm',
      onCost,
    })
    guard.setTenant('a')
    guard.on(end(Number.NaN, Number.POSITIVE_INFINITY))
    guard.on(end(-1, -2))
    expect(guard.promptTokens('a')).toBe(0)
    expect(guard.costUsd('a')).toBe(0)
    guard.on(end(1000, 0))
    expect(guard.costUsd('a')).toBeCloseTo(1, 6)
    const payload = onCost.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(Number.isFinite(payload.costUsd as number)).toBe(true)
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload)
  })

  it('rejects invalid budgets / defaultBudgetUsd / prices with ConfigError AK_CONFIG_INVALID', () => {
    for (const budgets of [
      { a: Number.NaN },
      { a: Number.POSITIVE_INFINITY },
      { a: -0.01 },
    ]) {
      try {
        multiTenantCostGuard({ budgets })
        expect.unreachable(`expected ConfigError for budgets=${JSON.stringify(budgets)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
    try {
      multiTenantCostGuard({ budgets: {}, defaultBudgetUsd: -1 })
      expect.unreachable('expected ConfigError for defaultBudgetUsd')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
    }
    try {
      multiTenantCostGuard({
        budgets: { a: 1 },
        prices: { bad: { input: Number.NaN, output: 0 } },
      })
      expect.unreachable('expected ConfigError for prices')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
    }
  })

  it('budget zero exceeds on first positive cost with finite utilization/callback fields', () => {
    const onExceeded = vi.fn()
    const onCost = vi.fn()
    const guard = multiTenantCostGuard({
      budgets: { a: 0 },
      prices: { m: { input: 1, output: 0 } },
      modelOverride: 'm',
      onExceeded,
      onCost,
    })
    guard.setTenant('a')
    guard.on(end(1000, 0))
    expect(guard.exceeded('a')).toBe(true)
    expect(onExceeded).toHaveBeenCalledTimes(1)
    const exceeded = onExceeded.mock.calls[0]![0] as { costUsd: number; budgetUsd: number }
    expect(exceeded.budgetUsd).toBe(0)
    expect(exceeded.costUsd).toBeGreaterThan(0)
    expect(Number.isFinite(exceeded.costUsd)).toBe(true)
    const costInfo = onCost.mock.calls[0]![0] as {
      budgetRemainingUsd: number | undefined
      costUsd: number
    }
    expect(Number.isFinite(costInfo.costUsd)).toBe(true)
    expect(Number.isFinite(costInfo.budgetRemainingUsd as number)).toBe(true)
    expect(JSON.parse(JSON.stringify(costInfo))).toEqual(costInfo)
  })

  it('isolates onCost/onExceeded sync throw and async reject without unhandledRejection', async () => {
    await expectNoUnhandledRejection(async () => {
      const errors: unknown[] = []
      const guard = multiTenantCostGuard({
        budgets: { a: 0.001 },
        modelOverride: 'gpt-4o',
        onCost: () => {
          throw new Error('onCost sync')
        },
        onExceeded: async () => {
          throw new Error('onExceeded reject')
        },
        onError: (e) => {
          errors.push(e)
        },
      })
      guard.setTenant('a')
      expect(() => guard.on(end(10_000, 5_000))).not.toThrow()
      expect(guard.exceeded('a')).toBe(true)
      await flush()
      await flush()
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('tenantOf throw is isolated and falls back to activeTenant', () => {
    const errors: unknown[] = []
    const guard = multiTenantCostGuard({
      budgets: { active: 10 },
      modelOverride: 'gpt-4o',
      tenantOf: () => {
        throw new Error('tenantOf boom')
      },
      onError: (e) => {
        errors.push(e)
      },
    })
    guard.setTenant('active')
    expect(() => {
      guard.on(start('gpt-4o'))
      guard.on(end(100, 100))
    }).not.toThrow()
    expect(guard.promptTokens('active')).toBe(100)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it('preserves sync concurrency across tenants without cross-tenant bleed', () => {
    const guard = multiTenantCostGuard({
      budgets: { a: 100, b: 100 },
      prices: {
        cheap: { input: 1, output: 0 },
        expensive: { input: 10, output: 0 },
      },
    })
    guard.setTenant('a')
    guard.on(start('cheap'))
    guard.on(end(1000, 0))
    guard.setTenant('b')
    guard.on(start('expensive'))
    guard.on(end(1000, 0))
    guard.setTenant('a')
    guard.on(start('expensive'))
    guard.on(end(1000, 0))
    expect(guard.costUsd('a')).toBeCloseTo(11, 6) // 1 + 10
    expect(guard.costUsd('b')).toBeCloseTo(10, 6)
    expect(guard.promptTokens('a')).toBe(2000)
    expect(guard.promptTokens('b')).toBe(1000)
  })
})
