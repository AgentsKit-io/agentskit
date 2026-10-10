import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfigError } from '@agentskit/core'
import {
  CostReservationError,
  createInMemoryCostStore,
  describeCostWindow,
  monthlyWindowKey,
  recordCostSpend,
  warnProcessLocalCostState,
} from '../src/cost-store'
import { costStoreContract } from '../src/cost-store-contract'

describe('createInMemoryCostStore', () => {
  it('passes the shared CostStore contract', async () => {
    const result = await costStoreContract(createInMemoryCostStore(), { tenantPrefix: 'memory' })
    expect(Object.values(result)).toEqual(Array(6).fill('passed'))
  })

  it('writes one ledger row per usage entry on the first commit only', async () => {
    const store = createInMemoryCostStore()
    await store.reserve({ tenant: 't', reservationId: 'r', amountUsd: 1 })
    const usage = [{ model: 'm', promptTokens: 10, completionTokens: 2, costUsd: 0.5, source: 'chat', fallback: true }]
    await store.commit({ tenant: 't', reservationId: 'r', actualUsd: 0.5, usage })
    await store.commit({ tenant: 't', reservationId: 'r', actualUsd: 0.5, usage })
    expect(store.ledger()).toEqual([{ ...usage[0], tenant: 't', reservationId: 'r' }])
  })

  it('uses the UTC month as the default accounting window', async () => {
    let now = new Date('2026-10-31T23:59:59Z')
    const store = createInMemoryCostStore({ now: () => now })
    expect(monthlyWindowKey(now)).toBe('2026-10')
    await recordCostSpend(store, { tenant: 't', costUsd: 2 })
    expect(await store.window({ tenant: 't', capUsd: 4 })).toMatchObject({ windowKey: '2026-10', spentUsd: 2, remainingUsd: 2, utilization: 0.5 })
    now = new Date('2026-11-01T00:00:00Z')
    expect(await store.window({ tenant: 't' })).toMatchObject({ windowKey: '2026-11', spentUsd: 0 })
  })

  it('rejects invalid tenants, ids and amounts before touching state', async () => {
    const store = createInMemoryCostStore()
    await expect(store.reserve({ tenant: ' ', reservationId: 'r', amountUsd: 1 })).rejects.toBeInstanceOf(ConfigError)
    await expect(store.reserve({ tenant: 't', reservationId: '', amountUsd: 1 })).rejects.toBeInstanceOf(ConfigError)
    await expect(store.reserve({ tenant: 't', reservationId: 'r', amountUsd: Number.NaN })).rejects.toBeInstanceOf(ConfigError)
    await expect(store.reserve({ tenant: 't', reservationId: 'r', amountUsd: 1, capUsd: -1 })).rejects.toBeInstanceOf(ConfigError)
    await store.reserve({ tenant: 't', reservationId: 'r', amountUsd: 1 })
    await expect(store.commit({ tenant: 't', reservationId: 'r', actualUsd: -1 })).rejects.toBeInstanceOf(ConfigError)
    await expect(store.commit({ tenant: 't', reservationId: 'r', actualUsd: 1, usage: [{ model: '', promptTokens: 1, completionTokens: 1, costUsd: 1 }] })).rejects.toBeInstanceOf(ConfigError)
    await expect(store.release({ tenant: 't', reservationId: 'missing' })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_NOT_FOUND' })
    expect(new CostReservationError('AK_COST_RESERVATION_RELEASED', 'x').message).toContain('already released')
  })

  it('keeps utilization finite for a zero cap', () => {
    expect(describeCostWindow('t', 'w', 0, 0, 0)).toMatchObject({ utilization: 0, remainingUsd: 0 })
    expect(describeCostWindow('t', 'w', 1, 0, 0)).toMatchObject({ utilization: 1, remainingUsd: 0 })
  })
})

describe('warnProcessLocalCostState', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('warns once per guard in production and stays silent elsewhere', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnProcessLocalCostState('scope-dev')
    expect(warn).not.toHaveBeenCalled()
    vi.stubEnv('NODE_ENV', 'production')
    warnProcessLocalCostState('scope-prod')
    warnProcessLocalCostState('scope-prod')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('scope-prod: no CostStore configured')
  })
})
