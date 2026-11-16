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

  it('rejects a released reservation id instead of replaying it as admitted', async () => {
    const store = createInMemoryCostStore()
    await store.reserve({ tenant: 't', reservationId: 'r', amountUsd: 1 })
    await store.release({ tenant: 't', reservationId: 'r' })
    await expect(store.reserve({ tenant: 't', reservationId: 'r', amountUsd: 1 })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_RELEASED' })
    expect(await store.window({ tenant: 't' })).toMatchObject({ reservedUsd: 0, spentUsd: 0 })
    await expect(store.window({ tenant: ' ' })).rejects.toBeInstanceOf(ConfigError)
    await expect(store.window({ tenant: 't', capUsd: -1 })).rejects.toBeInstanceOf(ConfigError)
    await expect(store.release({ tenant: 't', reservationId: ' ' })).rejects.toBeInstanceOf(ConfigError)
  })

  it('returns the hold of a dropped call once reservationTtlMs passes, without any job', async () => {
    let clock = Date.parse('2026-10-09T12:00:00Z')
    const store = createInMemoryCostStore({ now: () => new Date(clock), reservationTtlMs: 60_000 })
    expect(await store.reserve({ tenant: 't', reservationId: 'dropped', amountUsd: 0.8, capUsd: 1 })).toMatchObject({ ok: true })
    // The call dropped: it never commits nor releases its reservation.
    expect(await store.reserve({ tenant: 't', reservationId: 'next', amountUsd: 0.5, capUsd: 1 })).toMatchObject({ ok: false, reason: 'quota_exceeded' })
    clock += 60_000
    expect(await store.window({ tenant: 't', capUsd: 1 })).toMatchObject({ reservedUsd: 0.8, remainingUsd: expect.closeTo(0.2) })
    clock += 1
    expect(await store.window({ tenant: 't', capUsd: 1 })).toMatchObject({ reservedUsd: 0, spentUsd: 0, remainingUsd: 1 })
    expect(await store.reserve({ tenant: 't', reservationId: 'next', amountUsd: 0.5, capUsd: 1 })).toMatchObject({ ok: true, window: { reservedUsd: 0.5 } })
    await expect(store.commit({ tenant: 't', reservationId: 'dropped', actualUsd: 0.8 })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_RELEASED' })
    await expect(store.reserve({ tenant: 't', reservationId: 'dropped', amountUsd: 0.8, capUsd: 1 })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_RELEASED' })
    expect(await store.window({ tenant: 't' })).toMatchObject({ reservedUsd: 0.5, spentUsd: 0 })
  })

  it('lets a call settle while its reservation is inside reservationTtlMs', async () => {
    let clock = Date.parse('2026-10-09T12:00:00Z')
    const store = createInMemoryCostStore({ now: () => new Date(clock), reservationTtlMs: 60_000 })
    await store.reserve({ tenant: 't', reservationId: 'slow', amountUsd: 0.5, capUsd: 1 })
    clock += 60_000
    expect(await store.commit({ tenant: 't', reservationId: 'slow', actualUsd: 0.4 })).toMatchObject({ spentUsd: 0.4, reservedUsd: 0 })
    clock += 3_600_000
    expect(await store.window({ tenant: 't' })).toMatchObject({ spentUsd: 0.4, reservedUsd: 0 })
  })

  it('rejects an invalid reservationTtlMs', () => {
    expect(() => createInMemoryCostStore({ reservationTtlMs: 0 })).toThrow(ConfigError)
    expect(() => createInMemoryCostStore({ reservationTtlMs: Number.NaN })).toThrow(ConfigError)
  })

  it('keeps utilization finite for a zero cap', () => {
    expect(describeCostWindow('t', 'w', 0, 0, 0)).toMatchObject({ utilization: 0, remainingUsd: 0 })
    expect(describeCostWindow('t', 'w', 1, 0, 0)).toMatchObject({ utilization: 1, remainingUsd: 0 })
  })
})

describe('recordCostSpend', () => {
  it('releases the hold when the commit fails and rethrows the commit error', async () => {
    const store = createInMemoryCostStore()
    const failing = { ...store, commit: async () => { throw new Error('commit failed') } }
    await expect(recordCostSpend(failing, { tenant: 't', costUsd: 0.4 })).rejects.toThrow('commit failed')
    expect(await store.window({ tenant: 't' })).toMatchObject({ reservedUsd: 0, spentUsd: 0 })
  })

  it('still reports the commit error when the release fails too', async () => {
    const store = createInMemoryCostStore()
    const down = { ...store, commit: async () => { throw new Error('commit failed') }, release: async () => { throw new Error('release failed') } }
    await expect(recordCostSpend(down, { tenant: 't', costUsd: 0.4 })).rejects.toThrow('commit failed')
  })
})

describe('warnProcessLocalCostState', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
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

  it('follows an explicit choice over the detected runtime', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnProcessLocalCostState('scope-forced', true)
    expect(warn).toHaveBeenCalledTimes(1)
    vi.stubEnv('NODE_ENV', 'production')
    warnProcessLocalCostState('scope-silenced', false)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('warns on Cloudflare Workers, where NODE_ENV is not set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', undefined)
    warnProcessLocalCostState('scope-node-unset')
    expect(warn).not.toHaveBeenCalled()
    vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' })
    warnProcessLocalCostState('scope-worker')
    expect(warn).toHaveBeenCalledTimes(1)
    vi.stubEnv('NODE_ENV', 'development')
    warnProcessLocalCostState('scope-worker-dev')
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
