import { describe, expectTypeOf, it } from 'vitest'
import type {
  AdvancedCostGuardOptions,
  CostAlertEvent,
  CostAlertSink,
  CostAlertType,
  CostCapWindow,
  CostCaps,
  CostGuardMode,
} from '../src/cost-guard-advanced-types'

describe('cost-guard-advanced type contracts', () => {
  it('CostGuardMode is the three enforcement modes', () => {
    expectTypeOf<CostGuardMode>().toEqualTypeOf<'warn' | 'reject' | 'kill'>()
  })

  it('CostCapWindow requires finite windowMs and budgetUsd fields', () => {
    const cap: CostCapWindow = { windowMs: 60_000, budgetUsd: 1 }
    expectTypeOf(cap.windowMs).toBeNumber()
    expectTypeOf(cap.budgetUsd).toBeNumber()
  })

  it('CostCaps accepts named windows plus custom map', () => {
    const caps: CostCaps = {
      perMinute: { windowMs: 60_000, budgetUsd: 1 },
      perDay: { windowMs: 86_400_000, budgetUsd: 10 },
      perMonth: { windowMs: 30 * 86_400_000, budgetUsd: 100 },
      custom: { hourly: { windowMs: 3_600_000, budgetUsd: 5 } },
    }
    expectTypeOf(caps.perMinute).toEqualTypeOf<CostCapWindow | undefined>()
    expectTypeOf(caps.custom).toEqualTypeOf<Record<string, CostCapWindow> | undefined>()
  })

  it('CostAlertType enumerates threshold / exceeded / disabled / forecast', () => {
    expectTypeOf<CostAlertType>().toEqualTypeOf<
      'cost:threshold' | 'cost:exceeded' | 'cost:disabled' | 'cost:forecast'
    >()
  })

  it('CostAlertEvent carries utilization fields and optional forecast metadata', () => {
    const event: CostAlertEvent = {
      type: 'cost:forecast',
      tenant: 't1',
      window: 'perDay',
      at: '2026-01-01T00:00:00.000Z',
      costUsd: 0.5,
      budgetUsd: 1,
      utilization: 0.5,
      msUntilExceeded: 1_000,
      reason: 'projected overrun',
    }
    expectTypeOf(event.type).toEqualTypeOf<CostAlertType>()
    expectTypeOf(event.threshold).toEqualTypeOf<number | undefined>()
    expectTypeOf(event.msUntilExceeded).toEqualTypeOf<number | undefined>()
  })

  it('CostAlertSink accepts sync and async handlers', () => {
    const sync: CostAlertSink = () => {}
    const asyncSink: CostAlertSink = async () => {}
    expectTypeOf(sync).toMatchTypeOf<CostAlertSink>()
    expectTypeOf(asyncSink).toMatchTypeOf<CostAlertSink>()
  })

  it('AdvancedCostGuardOptions requires budgets and optional enforcement fields', () => {
    const options: AdvancedCostGuardOptions = {
      budgets: { default: 10 },
      defaultBudgetUsd: 1,
      mode: 'kill',
      disableRuntime: async (tenant, reason) => {
        expectTypeOf(tenant).toBeString()
        expectTypeOf(reason).toBeString()
      },
      alertSinks: [async () => {}],
      now: () => Date.now(),
      tenantOf: () => 'default',
    }
    expectTypeOf(options.budgets).toEqualTypeOf<Record<string, number>>()
    expectTypeOf(options.mode).toEqualTypeOf<CostGuardMode | undefined>()
    expectTypeOf(options.alertSinks).toEqualTypeOf<CostAlertSink[] | undefined>()
  })
})
