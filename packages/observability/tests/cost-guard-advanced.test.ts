import { describe, expect, it, vi } from 'vitest'
import {
  consoleAlertSink,
  createAdvancedCostGuard,
  throttle,
  webhookAlertSink,
  type CostAlertEvent,
} from '../src/cost-guard-advanced'
import { ConfigError, ErrorCodes, type AgentEvent } from '@agentskit/core'

function llmEnd(promptTokens: number, completionTokens: number): AgentEvent {
  return {
    type: 'llm:end',
    content: '',
    durationMs: 1,
    usage: { promptTokens, completionTokens },
  }
}

const flush = () => new Promise(r => setImmediate(r))

describe('createAdvancedCostGuard — concurrency', () => {
  it('does not double-count when llm:end events fire back-to-back synchronously', async () => {
    const g = createAdvancedCostGuard({
      budgets: {},
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    // Fire two events synchronously — the on() handler must update
    // state.totalCost before returning so the second call's delta is
    // computed against the up-to-date cumulative cost. Bug shape:
    // both calls saw state.totalCost = 0 → each added the cumulative
    // newTotal, doubling the final figure.
    g.on(llmEnd(1000, 1000))
    g.on(llmEnd(1000, 1000))
    await flush()
    // gpt-4o pricing: $0.0025 input + $0.01 output per 1k tokens.
    // Two events of (1000, 1000) → cumulative (2000, 2000) → cost
    // = 2*0.0025 + 2*0.01 = $0.025. Anything above that is double-count.
    expect(g.costUsd('t1')).toBeCloseTo(0.025, 6)
  })

  it('threshold alerts fire exactly once per (window, level) under concurrent events', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perDay: { windowMs: 86_400_000, budgetUsd: 0.01 } },
      alertSinks: [e => { events.push(e) }],
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    g.on(llmEnd(1000, 1000))
    g.on(llmEnd(1000, 1000))
    await flush()
    const fifty = events.filter(e => e.window === 'perDay' && e.threshold === 0.5)
    const eighty = events.filter(e => e.window === 'perDay' && e.threshold === 0.8)
    const hundred = events.filter(e => e.window === 'perDay' && e.threshold === 1)
    expect(fifty).toHaveLength(1)
    expect(eighty).toHaveLength(1)
    expect(hundred).toHaveLength(1)
  })
})

describe('createAdvancedCostGuard — modes', () => {
  it('mode=warn: tracks spend but never disables', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: { t1: 0.001 },
      alertSinks: [e => { events.push(e) }],
      mode: 'warn',
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    await g.on(llmEnd(1000, 1000))
    await flush()
    expect(g.isDisabled('t1')).toBe(false)
    expect(events.find(e => e.type === 'cost:exceeded')).toBeTruthy()
  })

  it('mode=kill: disables tenant on overall budget breach + invokes disableRuntime', async () => {
    const disabled: Array<{ tenant: string; reason: string }> = []
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: { t1: 0.001 },
      mode: 'kill',
      disableRuntime: (tenant, reason) => { disabled.push({ tenant, reason }) },
      alertSinks: [e => { events.push(e) }],
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    await g.on(llmEnd(1000, 1000))
    await flush()
    expect(g.isDisabled('t1')).toBe(true)
    expect(disabled).toHaveLength(1)
    expect(disabled[0].tenant).toBe('t1')
    expect(events.find(e => e.type === 'cost:disabled')).toBeTruthy()
  })

  it('mode=kill: refuses to construct without disableRuntime', () => {
    expect(() =>
      createAdvancedCostGuard({ budgets: {}, mode: 'kill' }),
    ).toThrow(/requires disableRuntime/)
  })

  it('mode=kill: stops counting spend after disabled', async () => {
    const g = createAdvancedCostGuard({
      budgets: { t1: 0.001 },
      mode: 'kill',
      disableRuntime: () => {},
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    await g.on(llmEnd(1000, 1000))
    await flush()
    const before = g.costUsd('t1')
    await g.on(llmEnd(1000, 1000))
    await flush()
    expect(g.costUsd('t1')).toBe(before)
  })

  it('enable() clears the disabled flag (manual re-enable)', async () => {
    const g = createAdvancedCostGuard({
      budgets: { t1: 0.001 },
      mode: 'kill',
      disableRuntime: () => {},
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    await g.on(llmEnd(1000, 1000))
    await flush()
    expect(g.isDisabled('t1')).toBe(true)
    g.enable('t1')
    expect(g.isDisabled('t1')).toBe(false)
  })
})

describe('createAdvancedCostGuard — window caps + threshold alerts', () => {
  it('fires 50% / 80% / 100% threshold alerts per window', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perDay: { windowMs: 86_400_000, budgetUsd: 0.01 } },
      alertSinks: [e => { events.push(e) }],
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    // ~$0.0125 in one llm:end (over 100%) — should fire all three
    await g.on(llmEnd(1000, 1000))
    await flush()
    const thresholds = events
      .filter(e => e.window === 'perDay')
      .map(e => e.threshold)
      .filter((x): x is number => typeof x === 'number')
    expect(thresholds).toContain(0.5)
    expect(thresholds).toContain(0.8)
    expect(thresholds).toContain(1)
  })

  it('does not fire the same threshold twice within a window', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perDay: { windowMs: 86_400_000, budgetUsd: 0.005 } },
      alertSinks: [e => { events.push(e) }],
      modelOverride: 'gpt-4o',
    })
    g.setTenant('t1')
    await g.on(llmEnd(500, 500))
    await flush()
    const firstCount = events.filter(e => e.window === 'perDay' && e.threshold === 0.5).length
    await g.on(llmEnd(100, 100))
    await flush()
    const secondCount = events.filter(e => e.window === 'perDay' && e.threshold === 0.5).length
    expect(secondCount).toBe(firstCount) // no duplicate 50% alert
  })

  it('rolls a new window after windowMs elapses', async () => {
    let now = 1_000_000
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perMinute: { windowMs: 60_000, budgetUsd: 0.005 } },
      alertSinks: [e => { events.push(e) }],
      modelOverride: 'gpt-4o',
      now: () => now,
    })
    g.setTenant('t1')
    await g.on(llmEnd(500, 500))
    await flush()
    expect(g.windowSpend('t1', 'perMinute')).toBeGreaterThan(0)

    now += 70_000 // past the window
    await g.on(llmEnd(100, 100))
    await flush()
    // Bucket reset → window spend equals only the second call
    expect(g.windowSpend('t1', 'perMinute')).toBeLessThan(0.005)
  })
})

describe('createAdvancedCostGuard — forecast', () => {
  it('emits cost:forecast when projected to overrun mid-window', async () => {
    let now = 1_000_000
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perDay: { windowMs: 86_400_000, budgetUsd: 0.01 } },
      alertSinks: [e => { events.push(e) }],
      modelOverride: 'gpt-4o',
      now: () => now,
    })
    g.setTenant('t1')
    // First spend creates the bucket at t=now.
    await g.on(llmEnd(100, 100)) // ~$0.0013 — under the 50% threshold
    await flush()
    // Advance ~30% of the window. Adding ~$0.005 brings us to ~$0.0063.
    // Linear projection: 0.0063 / 0.3 = $0.021 — well over the $0.01 cap.
    now += 86_400_000 * 0.3
    await g.on(llmEnd(400, 400))
    await flush()
    const forecast = events.find(e => e.type === 'cost:forecast')
    expect(forecast).toBeTruthy()
    expect(forecast!.msUntilExceeded).toBeGreaterThan(0)
  })
})

describe('createAdvancedCostGuard — tenant + multi-tenant', () => {
  it('tenantOf wins over setTenant when both supplied', async () => {
    let active = 'a'
    const g = createAdvancedCostGuard({
      budgets: {},
      tenantOf: () => active,
      modelOverride: 'gpt-4o',
    })
    g.setTenant('z') // ignored
    await g.on(llmEnd(100, 100))
    await flush()
    expect(g.costUsd('a')).toBeGreaterThan(0)
    expect(g.costUsd('z')).toBe(0)
  })

  it('tenantCaps override workspace caps', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perDay: { windowMs: 86_400_000, budgetUsd: 1 } },
      tenantCaps: { strict: { perDay: { windowMs: 86_400_000, budgetUsd: 0.001 } } },
      alertSinks: [e => { events.push(e) }],
      modelOverride: 'gpt-4o',
    })
    g.setTenant('strict')
    await g.on(llmEnd(100, 100))
    await flush()
    expect(events.find(e => e.tenant === 'strict' && e.threshold === 1)).toBeTruthy()
  })

  it('reset(tenant) clears just that tenant', async () => {
    const g = createAdvancedCostGuard({ budgets: {}, modelOverride: 'gpt-4o' })
    g.setTenant('a')
    await g.on(llmEnd(100, 100))
    g.setTenant('b')
    await g.on(llmEnd(100, 100))
    g.reset('a')
    expect(g.costUsd('a')).toBe(0)
    expect(g.costUsd('b')).toBeGreaterThan(0)
  })
})

describe('alert sinks', () => {
  it('webhookAlertSink POSTs the event JSON', async () => {
    const captured: Array<{ url: string; init: RequestInit }> = []
    const fakeFetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(url), init: init ?? {} })
      return new Response(null, { status: 204 })
    }) as unknown as typeof fetch
    const sink = webhookAlertSink({
      url: 'https://hooks.example/cost',
      fetch: fakeFetch,
      headers: { authorization: 'Bearer secret' },
    })
    const event: CostAlertEvent = {
      type: 'cost:exceeded',
      tenant: 't1',
      window: 'perDay',
      at: '2026-01-01T00:00:00.000Z',
      costUsd: 1.5,
      budgetUsd: 1,
      utilization: 1.5,
      threshold: 1,
    }
    await sink(event)
    expect(captured).toHaveLength(1)
    expect(captured[0].url).toBe('https://hooks.example/cost')
    expect((captured[0].init.headers as Record<string, string>).authorization).toBe('Bearer secret')
    expect(JSON.parse(String(captured[0].init.body))).toEqual(event)
  })

  it('throttle suppresses repeat alerts within windowMs', async () => {
    let now = 1000
    let count = 0
    const inner: Parameters<typeof throttle>[0] = () => { count++ }
    const sink = throttle(inner, 5000, () => now)
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
    await sink(event)
    await sink(event)
    expect(count).toBe(1)
    now += 6000
    await sink(event)
    expect(count).toBe(2)
  })

  it('throttle keys on (type, tenant, window, threshold) — different tenants pass independently', async () => {
    let count = 0
    const sink = throttle(() => { count++ }, 60_000)
    const base: CostAlertEvent = {
      type: 'cost:threshold',
      tenant: 'a',
      window: 'perDay',
      at: '2026-01-01T00:00:00.000Z',
      costUsd: 0.5,
      budgetUsd: 1,
      utilization: 0.5,
      threshold: 0.5,
    }
    await sink(base)
    await sink({ ...base, tenant: 'b' })
    expect(count).toBe(2)
  })

  it('consoleAlertSink writes a structured line to stderr', () => {
    const writes: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string) => { writes.push(String(chunk)); return true }) as typeof process.stderr.write
    try {
      consoleAlertSink()({
        type: 'cost:exceeded',
        tenant: 't1',
        window: 'perDay',
        at: '2026-01-01T00:00:00.000Z',
        costUsd: 1.5,
        budgetUsd: 1,
        utilization: 1.5,
        threshold: 1,
      })
    } finally {
      process.stderr.write = original
    }
    expect(writes[0]).toContain('cost:exceeded')
    expect(writes[0]).toContain('tenant=t1')
    expect(writes[0]).toContain('window=perDay')
  })

  it('webhookAlertSink rejects HTTP !ok responses', async () => {
    const sink = webhookAlertSink({
      url: 'https://hooks.example/cost',
      fetch: (async () => new Response('nope', { status: 500 })) as typeof fetch,
    })
    await expect(
      sink({
        type: 'cost:exceeded',
        tenant: 't1',
        window: 'perDay',
        at: '2026-01-01T00:00:00.000Z',
        costUsd: 1,
        budgetUsd: 1,
        utilization: 1,
        threshold: 1,
      }),
    ).rejects.toThrow(/500|HTTP|ok/i)
  })

  it('throttle rejects non-finite / non-positive windowMs with ConfigError', () => {
    const sink = () => {}
    for (const windowMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      try {
        throttle(sink, windowMs)
        expect.unreachable(`expected ConfigError for windowMs=${String(windowMs)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
  })
})

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

describe('createAdvancedCostGuard — hardening wave', () => {
  it('mixed-model accounting is incremental (not recomputed with latest price)', async () => {
    const g = createAdvancedCostGuard({
      budgets: {},
      prices: {
        cheap: { input: 1, output: 0 },
        expensive: { input: 100, output: 0 },
      },
    })
    g.setTenant('t1')
    g.on({ type: 'llm:start', model: 'cheap', messageCount: 1 })
    g.on(llmEnd(1000, 0))
    g.on({ type: 'llm:start', model: 'expensive', messageCount: 1 })
    g.on(llmEnd(1000, 0))
    await flush()
    expect(g.costUsd('t1')).toBeCloseTo(101, 6)
  })

  it('normalizes hostile usage and keeps alert numbers finite/JSON-safe', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: { t1: 0.5 },
      prices: { m: { input: 1, output: 0 } },
      modelOverride: 'm',
      alertSinks: [(e) => { events.push(e) }],
    })
    g.setTenant('t1')
    g.on(llmEnd(Number.NaN, Number.POSITIVE_INFINITY))
    g.on(llmEnd(-10, -20))
    expect(g.costUsd('t1')).toBe(0)
    g.on(llmEnd(1000, 0))
    await flush()
    expect(g.costUsd('t1')).toBeCloseTo(1, 6)
    for (const e of events) {
      expect(Number.isFinite(e.costUsd)).toBe(true)
      expect(Number.isFinite(e.budgetUsd)).toBe(true)
      expect(Number.isFinite(e.utilization)).toBe(true)
      expect(JSON.parse(JSON.stringify(e))).toEqual(e)
    }
  })

  it('validates budgets, caps, nested tenantCaps/custom, prices, and mode with ConfigError', () => {
    const badBudgets = [
      () => createAdvancedCostGuard({ budgets: { a: Number.NaN } }),
      () => createAdvancedCostGuard({ budgets: {}, defaultBudgetUsd: -1 }),
      () => createAdvancedCostGuard({ budgets: {}, prices: { m: { input: -1, output: 0 } } }),
      () =>
        createAdvancedCostGuard({
          budgets: {},
          caps: { perDay: { windowMs: 0, budgetUsd: 1 } },
        }),
      () =>
        createAdvancedCostGuard({
          budgets: {},
          caps: { perMinute: { windowMs: 1000, budgetUsd: Number.NaN } },
        }),
      () =>
        createAdvancedCostGuard({
          budgets: {},
          caps: { custom: { hourly: { windowMs: Number.POSITIVE_INFINITY, budgetUsd: 1 } } },
        }),
      () =>
        createAdvancedCostGuard({
          budgets: {},
          tenantCaps: { t: { perDay: { windowMs: -5, budgetUsd: 1 } } },
        }),
      () =>
        createAdvancedCostGuard({
          budgets: {},
          // @ts-expect-error intentional invalid mode
          mode: 'pause',
        }),
    ]
    for (const fn of badBudgets) {
      try {
        fn()
        expect.unreachable('expected ConfigError')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
  })

  it('zero window cap fires 50/80/100/exceeded on first positive spend with finite utilization=1', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perDay: { windowMs: 86_400_000, budgetUsd: 0 } },
      alertSinks: [(e) => { events.push(e) }],
      prices: { m: { input: 1, output: 0 } },
      modelOverride: 'm',
    })
    g.setTenant('t1')
    g.on(llmEnd(1000, 0))
    await flush()
    const day = events.filter((e) => e.window === 'perDay')
    const thresholds = day.map((e) => e.threshold).filter((x): x is number => typeof x === 'number')
    expect(thresholds).toContain(0.5)
    expect(thresholds).toContain(0.8)
    expect(thresholds).toContain(1)
    expect(day.some((e) => e.type === 'cost:exceeded')).toBe(true)
    for (const e of day) {
      expect(Number.isFinite(e.utilization)).toBe(true)
      expect(e.utilization).toBe(1)
      expect(JSON.parse(JSON.stringify(e))).toEqual(e)
    }
  })

  it('zero overall budget exceeds with finite utilization on first positive spend', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: { t1: 0 },
      alertSinks: [(e) => { events.push(e) }],
      prices: { m: { input: 1, output: 0 } },
      modelOverride: 'm',
    })
    g.setTenant('t1')
    g.on(llmEnd(1000, 0))
    await flush()
    const overall = events.find((e) => e.window === 'overall' && e.type === 'cost:exceeded')
    expect(overall).toBeTruthy()
    expect(Number.isFinite(overall!.utilization)).toBe(true)
    expect(overall!.utilization).toBe(1)
    expect(JSON.parse(JSON.stringify(overall))).toEqual(overall)
  })

  it('tenantOf throw is isolated and falls back to activeTenant', async () => {
    const errors: unknown[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      modelOverride: 'gpt-4o',
      tenantOf: () => {
        throw new Error('tenantOf boom')
      },
      onError: (e) => {
        errors.push(e)
      },
    })
    g.setTenant('active')
    expect(() => g.on(llmEnd(100, 100))).not.toThrow()
    await flush()
    expect(g.costUsd('active')).toBeGreaterThan(0)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it('hostile now() throw / NaN / Infinity is isolated and does not corrupt state', async () => {
    await expectNoUnhandledRejection(async () => {
      const errors: unknown[] = []
      let tick = 0
      const g = createAdvancedCostGuard({
        budgets: {},
        caps: { perMinute: { windowMs: 60_000, budgetUsd: 10 } },
        prices: { m: { input: 1, output: 0 } },
        modelOverride: 'm',
        now: () => {
          tick += 1
          if (tick === 1) throw new Error('clock throw')
          if (tick === 2) return Number.NaN
          if (tick === 3) return Number.POSITIVE_INFINITY
          return 1_000_000
        },
        onError: (e) => {
          errors.push(e)
        },
      })
      g.setTenant('t1')
      expect(() => g.on(llmEnd(1000, 0))).not.toThrow()
      expect(() => g.on(llmEnd(1000, 0))).not.toThrow()
      expect(() => g.on(llmEnd(1000, 0))).not.toThrow()
      expect(Number.isFinite(g.costUsd('t1'))).toBe(true)
      expect(g.costUsd('t1')).toBeCloseTo(3, 6)
      await flush()
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('alert sinks receive independent top-level copies; mutator/throw/reject does not affect next sink or unhandled', async () => {
    await expectNoUnhandledRejection(async () => {
      const second: CostAlertEvent[] = []
      const errors: unknown[] = []
      const g = createAdvancedCostGuard({
        budgets: { t1: 0.001 },
        modelOverride: 'gpt-4o',
        onError: (e) => {
          errors.push(e)
        },
        alertSinks: [
          (e) => {
            // Mutate top-level fields — must not poison subsequent sinks.
            ;(e as { utilization: number }).utilization = Number.POSITIVE_INFINITY
            ;(e as { type: string }).type = 'mutated'
            throw new Error('sink throw')
          },
          async (e) => {
            second.push({ ...e })
            throw new Error('sink reject')
          },
        ],
      })
      g.setTenant('t1')
      g.on(llmEnd(1000, 1000))
      await flush()
      await flush()
      expect(second.length).toBeGreaterThanOrEqual(1)
      for (const e of second) {
        expect(e.type).not.toBe('mutated')
        expect(Number.isFinite(e.utilization)).toBe(true)
      }
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('disableRuntime async reject is isolated; kill state stays fail-closed disabled', async () => {
    await expectNoUnhandledRejection(async () => {
      const errors: unknown[] = []
      const g = createAdvancedCostGuard({
        budgets: { t1: 0.001 },
        mode: 'kill',
        disableRuntime: async () => {
          throw new Error('disable reject')
        },
        modelOverride: 'gpt-4o',
        onError: (e) => {
          errors.push(e)
        },
      })
      g.setTenant('t1')
      g.on(llmEnd(1000, 1000))
      await flush()
      await flush()
      expect(g.isDisabled('t1')).toBe(true)
      const before = g.costUsd('t1')
      g.on(llmEnd(1000, 1000))
      expect(g.costUsd('t1')).toBe(before)
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('threshold alerts still fire exactly once under incremental mixed models', async () => {
    const events: CostAlertEvent[] = []
    const g = createAdvancedCostGuard({
      budgets: {},
      caps: { perDay: { windowMs: 86_400_000, budgetUsd: 50 } },
      prices: {
        cheap: { input: 10, output: 0 },
        expensive: { input: 40, output: 0 },
      },
      alertSinks: [(e) => { events.push(e) }],
    })
    g.setTenant('t1')
    g.on({ type: 'llm:start', model: 'cheap', messageCount: 1 })
    g.on(llmEnd(1000, 0)) // $10
    g.on({ type: 'llm:start', model: 'expensive', messageCount: 1 })
    g.on(llmEnd(1000, 0)) // +$40 → total $50 exactly 100%
    await flush()
    const fifty = events.filter((e) => e.window === 'perDay' && e.threshold === 0.5)
    const eighty = events.filter((e) => e.window === 'perDay' && e.threshold === 0.8)
    const hundred = events.filter((e) => e.window === 'perDay' && e.threshold === 1)
    expect(fifty).toHaveLength(1)
    expect(eighty).toHaveLength(1)
    expect(hundred).toHaveLength(1)
    expect(g.costUsd('t1')).toBeCloseTo(50, 6)
  })

  it('mode=reject exposes isRejected for overall and window caps; warn/kill always false', async () => {
    let now = 1_000_000
    const rejectOverall = createAdvancedCostGuard({
      budgets: { t1: 0.001 },
      mode: 'reject',
      modelOverride: 'gpt-4o',
    })
    rejectOverall.setTenant('t1')
    rejectOverall.on(llmEnd(1000, 1000))
    await flush()
    expect(rejectOverall.isRejected('t1')).toBe(true)
    // overall rejection persists until reset
    expect(rejectOverall.isRejected('t1')).toBe(true)
    rejectOverall.reset('t1')
    expect(rejectOverall.isRejected('t1')).toBe(false)

    const rejectWindow = createAdvancedCostGuard({
      budgets: {},
      mode: 'reject',
      caps: { perMinute: { windowMs: 60_000, budgetUsd: 0.001 } },
      modelOverride: 'gpt-4o',
      now: () => now,
    })
    rejectWindow.setTenant('t1')
    rejectWindow.on(llmEnd(1000, 1000))
    await flush()
    expect(rejectWindow.isRejected('t1')).toBe(true)
    now += 70_000
    expect(rejectWindow.isRejected('t1')).toBe(false)

    const warnG = createAdvancedCostGuard({
      budgets: { t1: 0.001 },
      mode: 'warn',
      modelOverride: 'gpt-4o',
    })
    warnG.setTenant('t1')
    warnG.on(llmEnd(1000, 1000))
    await flush()
    expect(warnG.isRejected('t1')).toBe(false)

    const killG = createAdvancedCostGuard({
      budgets: { t1: 0.001 },
      mode: 'kill',
      disableRuntime: () => {},
      modelOverride: 'gpt-4o',
    })
    killG.setTenant('t1')
    killG.on(llmEnd(1000, 1000))
    await flush()
    expect(killG.isDisabled('t1')).toBe(true)
    expect(killG.isRejected('t1')).toBe(false)
  })

  it('isRejected never throws under hostile clocks and keeps isolation', async () => {
    await expectNoUnhandledRejection(async () => {
      const errors: unknown[] = []
      let clockMode: 'ok' | 'throw' | 'invalid' = 'ok'
      const synthetic = 1_000_000
      const g = createAdvancedCostGuard({
        budgets: {},
        mode: 'reject',
        caps: { perMinute: { windowMs: 60_000, budgetUsd: 0.001 } },
        modelOverride: 'gpt-4o',
        now: () => {
          if (clockMode === 'throw') throw new Error('clock for isRejected')
          if (clockMode === 'invalid') return Number.MAX_VALUE
          return synthetic
        },
        onError: (e) => {
          errors.push(e)
        },
      })
      g.setTenant('t1')
      g.on(llmEnd(1000, 1000))
      await flush()
      expect(g.isRejected('t1')).toBe(true)

      // After a valid synthetic epoch, throw must not jump to wall-clock Date.now()
      // (which would roll the window by decades and clear isRejected).
      clockMode = 'throw'
      expect(() => g.isRejected('t1')).not.toThrow()
      expect(g.isRejected('t1')).toBe(true)

      clockMode = 'invalid'
      expect(() => g.isRejected('t1')).not.toThrow()
      expect(g.isRejected('t1')).toBe(true)

      expect(errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('finite-but-invalid Date epochs from now() are isolated with valid ISO alert timestamps', async () => {
    await expectNoUnhandledRejection(async () => {
      const events: CostAlertEvent[] = []
      const errors: unknown[] = []
      const g = createAdvancedCostGuard({
        budgets: { t1: 0.001 },
        modelOverride: 'gpt-4o',
        now: () => Number.MAX_VALUE,
        alertSinks: [(e) => { events.push(e) }],
        onError: (e) => {
          errors.push(e)
        },
      })
      g.setTenant('t1')
      expect(() => g.on(llmEnd(1000, 1000))).not.toThrow()
      await flush()
      expect(g.costUsd('t1')).toBeCloseTo(0.0125, 6)
      expect(events.length).toBeGreaterThanOrEqual(1)
      for (const e of events) {
        expect(() => new Date(e.at).toISOString()).not.toThrow()
        expect(Number.isNaN(Date.parse(e.at))).toBe(false)
        expect(e.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      }
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('webhookAlertSink no-ops when global fetch is absent and restores cleanly', async () => {
    const g = globalThis as { fetch?: typeof globalThis.fetch }
    const original = g.fetch
    try {
      g.fetch = undefined
      const sink = webhookAlertSink({ url: 'https://hooks.example/cost' })
      await expect(
        sink({
          type: 'cost:exceeded',
          tenant: 't1',
          window: 'perDay',
          at: '2026-01-01T00:00:00.000Z',
          costUsd: 1,
          budgetUsd: 1,
          utilization: 1,
          threshold: 1,
        }),
      ).resolves.toBeUndefined()
    } finally {
      if (original !== undefined) g.fetch = original
      else delete g.fetch
    }
  })
})
