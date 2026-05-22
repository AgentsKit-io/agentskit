import { describe, expect, it, vi } from 'vitest'
import {
  consoleAlertSink,
  createAdvancedCostGuard,
  throttle,
  webhookAlertSink,
  type CostAlertEvent,
} from '../src/cost-guard-advanced'
import type { AgentEvent } from '@agentskit/core'

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
})
