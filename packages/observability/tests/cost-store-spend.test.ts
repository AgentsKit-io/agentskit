import { describe, expect, it } from 'vitest'
import { createInMemoryCostStore } from '../src/cost-store'
import { recordCostSpend } from '../src/cost-store-spend'

describe('recordCostSpend', () => {
  it('commits spend that already happened and returns the window', async () => {
    const store = createInMemoryCostStore()
    const window = await recordCostSpend(store, { tenant: 'acme', costUsd: 0.5 })
    expect(window.spentUsd).toBeCloseTo(0.5)
  })

  it('releases the hold and rethrows when the commit fails', async () => {
    const store = createInMemoryCostStore()
    const released: string[] = []
    const failing = {
      ...store,
      reserve: store.reserve.bind(store),
      commit: async () => { throw new Error('boom') },
      release: async (input: { tenant: string; reservationId: string }) => { released.push(input.reservationId); return store.release(input) },
    } as typeof store
    await expect(recordCostSpend(failing, { tenant: 'acme', costUsd: 1 })).rejects.toThrow('boom')
    expect(released).toHaveLength(1)
  })
})

describe('count with the store reservationTtlMs', () => {
  it('leaves out reservations past the store TTL when the call omits it', async () => {
    let at = 0
    const store = createInMemoryCostStore({ reservationTtlMs: 60_000, now: () => new Date(at), windowKey: () => 'w' })
    const kind = 'generate-description'
    await store.reserve({ tenant: 't', reservationId: 'done', amountUsd: 0.1, kind })
    await store.commit({ tenant: 't', reservationId: 'done', actualUsd: 0.1 })
    await store.reserve({ tenant: 't', reservationId: 'crashed', amountUsd: 0.1, kind })
    expect(await store.count({ tenant: 't', kind })).toBe(2)
    at = 20 * 60_000
    expect(await store.count({ tenant: 't', kind })).toBe(1)
  })
})
