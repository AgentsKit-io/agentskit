import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentEvent } from '@agentskit/core'
import { costGuard } from '../src/cost-guard'
import { createAdvancedCostGuard } from '../src/cost-guard-advanced'
import { multiTenantCostGuard } from '../src/cost-guard-multi-tenant'
import { createInMemoryCostStore, type CostStore } from '../src/cost-store'

const flush = async () => { for (let i = 0; i < 5; i++) await new Promise<void>(resolve => setImmediate(resolve)) }
const prices = { m: { input: 1, output: 0 } }
const call = (promptTokens: number): AgentEvent[] => [
  { type: 'llm:start', spanId: 's', parentSpanId: undefined, model: 'm', attributes: {}, startTime: 0 } as unknown as AgentEvent,
  { type: 'llm:end', spanId: 's', usage: { promptTokens, completionTokens: 0 }, endTime: 1 } as unknown as AgentEvent,
]
const send = (observer: { on?: (event: AgentEvent) => void }, promptTokens: number) => {
  for (const event of call(promptTokens)) observer.on?.(event)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('cost guards with a CostStore', () => {
  it('costGuard aborts on spend recorded by another instance', async () => {
    const store = createInMemoryCostStore()
    const first = costGuard({ budgetUsd: 1, controller: new AbortController(), prices, store, tenant: 'acme' })
    const controller = new AbortController()
    const onExceeded = vi.fn()
    const second = costGuard({ budgetUsd: 1, controller, prices, store, tenant: 'acme', onExceeded })
    send(first, 700)
    await flush()
    send(second, 700)
    expect(second.exceeded()).toBe(false)
    await flush()
    expect(second.costUsd()).toBeCloseTo(0.7)
    expect(second.exceeded()).toBe(true)
    expect(controller.signal.aborted).toBe(true)
    expect(onExceeded).toHaveBeenCalledWith({ costUsd: expect.closeTo(1.4), budgetUsd: 1 })
    expect(store.ledger()).toHaveLength(2)
    expect(store.ledger()[0]).toMatchObject({ tenant: 'acme', model: 'm', promptTokens: 700, costUsd: expect.closeTo(0.7) })
  })

  it('multiTenantCostGuard trips per tenant from the durable window', async () => {
    const store = createInMemoryCostStore()
    const onExceeded = vi.fn()
    const make = () => multiTenantCostGuard({ budgets: { a: 1, b: 1 }, prices, store, onExceeded })
    const [one, two] = [make(), make()]
    one.setTenant('a')
    two.setTenant('a')
    send(one, 600)
    await flush()
    send(two, 600)
    await flush()
    expect(two.exceeded('a')).toBe(true)
    expect(two.exceeded('b')).toBe(false)
    expect(onExceeded).toHaveBeenCalledTimes(1)
    expect(await store.window({ tenant: 'a' })).toMatchObject({ spentUsd: expect.closeTo(1.2) })
  })

  it('createAdvancedCostGuard rejects and kills on the durable overall budget', async () => {
    const store = createInMemoryCostStore()
    const warm = createAdvancedCostGuard({ budgets: { a: 1 }, prices, store })
    warm.setTenant('a')
    send(warm, 900)
    await flush()
    const reject = createAdvancedCostGuard({ budgets: { a: 1 }, prices, store, mode: 'reject' })
    reject.setTenant('a')
    send(reject, 200)
    expect(reject.isRejected('a')).toBe(false)
    await flush()
    expect(reject.isRejected('a')).toBe(true)
    const disableRuntime = vi.fn()
    const alerts: string[] = []
    const kill = createAdvancedCostGuard({ budgets: { a: 1 }, prices, store, mode: 'kill', disableRuntime, alertSinks: [event => { alerts.push(event.type) }] })
    kill.setTenant('a')
    send(kill, 100)
    await flush()
    expect(kill.isDisabled('a')).toBe(true)
    expect(disableRuntime).toHaveBeenCalledWith('a', 'overall budget exceeded ($1 cap)')
    expect(alerts).toEqual(['cost:exceeded', 'cost:disabled'])
  })

  it('isolates store failures and reports them through onError', async () => {
    const failing: CostStore = {
      reserve: async () => { throw new Error('store down') },
      commit: async () => { throw new Error('store down') },
      release: async () => { throw new Error('store down') },
      window: async () => { throw new Error('store down') },
    }
    const onError = vi.fn()
    const guard = costGuard({ budgetUsd: 1, controller: new AbortController(), prices, store: failing, onError })
    expect(() => send(guard, 100)).not.toThrow()
    await flush()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'store down' }))
    expect(guard.costUsd()).toBeCloseTo(0.1)
  })

  it('warns once when the store fails and no onError handler is set', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const failing: CostStore = {
      reserve: async () => { throw new Error('store down') },
      commit: async () => { throw new Error('store down') },
      release: async () => { throw new Error('store down') },
      window: async () => { throw new Error('store down') },
    }
    const guard = costGuard({ budgetUsd: 1, controller: new AbortController(), prices, store: failing })
    send(guard, 100)
    await flush()
    send(guard, 100)
    await flush()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('costGuard: writing to the CostStore failed (store down)')
    const handled = costGuard({ budgetUsd: 1, controller: new AbortController(), prices, store: failing, onError: () => {} })
    send(handled, 100)
    await flush()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('lets a host force or silence the missing-store warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // A fresh module instance: the warning fires once per guard name in a process.
    vi.resetModules()
    const fresh = await import('../src/cost-guard-multi-tenant')
    fresh.multiTenantCostGuard({ budgets: {}, warnWithoutStore: true })
    expect(warn).toHaveBeenCalledTimes(1)
    vi.stubEnv('NODE_ENV', 'production')
    costGuard({ budgetUsd: 1, controller: new AbortController(), warnWithoutStore: false })
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('warns in production when no store is configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')
    costGuard({ budgetUsd: 1, controller: new AbortController() })
    multiTenantCostGuard({ budgets: {} })
    createAdvancedCostGuard({ budgets: {} })
    costGuard({ budgetUsd: 1, controller: new AbortController(), store: createInMemoryCostStore() })
    expect(warn.mock.calls.map(args => String(args[0]).split(':')[0])).toEqual([
      '[agentskit] costGuard', '[agentskit] multiTenantCostGuard', '[agentskit] createAdvancedCostGuard',
    ])
  })
})
