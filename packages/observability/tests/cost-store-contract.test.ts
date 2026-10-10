import { describe, expect, it } from 'vitest'
import { createInMemoryCostStore, type CostStore } from '../src/cost-store'
import { costStoreContract } from '../src/cost-store-contract'

const run = (store: CostStore) => costStoreContract(store, { tenantPrefix: 'broken', concurrency: 20, turns: 20 })
const broken = (override: (store: CostStore) => Partial<CostStore>): CostStore => {
  const store = createInMemoryCostStore()
  return { ...store, ...override(store) }
}

describe('costStoreContract', () => {
  it('fails a store that checks the cap before an asynchronous write', async () => {
    const reserved = new Map<string, number>()
    const racy = broken(store => ({
      async reserve(input) {
        const held = reserved.get(input.tenant) ?? 0
        await Promise.resolve()
        if (input.capUsd !== undefined && held + input.amountUsd > input.capUsd) return { ok: false, reason: 'quota_exceeded', window: await store.window(input) }
        reserved.set(input.tenant, held + input.amountUsd)
        await store.reserve({ ...input, capUsd: undefined })
        return { ok: true, reservationId: input.reservationId, window: await store.window(input) }
      },
    }))
    await expect(run(racy)).rejects.toThrow(/never exceed the cap/)
  })

  it('fails a store that counts a repeated reservation id twice', async () => {
    let attempt = 0
    const doubled = broken(store => ({
      reserve: input => store.reserve(input.reservationId === 'same' ? { ...input, reservationId: `same-${attempt++}` } : input),
    }))
    await expect(run(doubled)).rejects.toThrow(/counted once/)
  })

  it('fails a store that keeps a released reservation held', async () => {
    const leaky = broken(store => ({ release: input => store.window({ tenant: input.tenant, windowKey: 'contract' }) }))
    await expect(run(leaky)).rejects.toThrow(/release returns the reservation|commit after release/)
  })

  it('fails a store that shares reservations between tenants', async () => {
    const shared = broken(store => ({
      reserve: input => store.reserve({ ...input, tenant: input.tenant.includes('isolation') ? 'broken:shared' : input.tenant }),
    }))
    await expect(run(shared)).rejects.toThrow(/tenants do not share caps/)
  })

  it('fails a store that settles unknown reservations silently', async () => {
    const silent = broken(store => ({
      commit: async input => {
        try { return await store.commit(input) } catch { return store.window({ tenant: input.tenant, windowKey: 'contract' }) }
      },
    }))
    await expect(run(silent)).rejects.toThrow(/commit after release is rejected/)
  })
})
