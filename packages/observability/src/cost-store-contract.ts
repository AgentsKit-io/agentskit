import { AgentsKitError } from '@agentskit/core'
import { CostReservationError, type CostStore } from './cost-store'

/** Options of `costStoreContract`. */
export interface CostStoreContractOptions {
  /** Unique prefix for the tenants this run creates, so runs never share state. */
  tenantPrefix: string
  /** Parallel reservations raced against the cap. Default 50. */
  concurrency?: number
  /** Turns simulated by the release check. Default 100; one in five fails. */
  turns?: number
}

/** Names of the checks run by `costStoreContract`, each mapped to `'passed'`. */
export interface CostStoreContractResult {
  accounting: 'passed'
  cap: 'passed'
  idempotency: 'passed'
  settlement: 'passed'
  isolation: 'passed'
  release: 'passed'
}

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new AgentsKitError({ code: 'AK_COST_STORE_CONTRACT', message: `CostStore contract: ${message}` })
}

const near = (actual: number, expected: number): boolean => Math.abs(actual - expected) < 1e-9

async function rejectsWith(code: CostReservationError['code'], run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run()
    return false
  } catch (error) {
    return error instanceof CostReservationError && error.code === code
  }
}

/**
 * Framework-free contract every `CostStore` must pass. Runs against the store
 * the caller supplies and throws on the first violated guarantee.
 * @param store Store under test, already migrated and empty for `tenantPrefix`.
 * @param options Tenant prefix and load sizes.
 * @returns One `'passed'` entry per check.
 * @example
 * ```ts
 * await costStoreContract(postgresCostStore({ db }), { tenantPrefix: crypto.randomUUID() })
 * ```
 */
export async function costStoreContract(store: CostStore, options: CostStoreContractOptions): Promise<CostStoreContractResult> {
  const tenant = (name: string): string => `${options.tenantPrefix}:${name}`
  const windowKey = 'contract'

  const a = tenant('accounting')
  const first = await store.reserve({ tenant: a, reservationId: 'r1', amountUsd: 0.4, capUsd: 1, windowKey })
  check(first.ok && near(first.window.reservedUsd, 0.4) && near(first.window.remainingUsd ?? -1, 0.6), 'reserve holds the amount against the cap')
  const committed = await store.commit({
    tenant: a,
    reservationId: 'r1',
    actualUsd: 0.25,
    usage: [{ model: 'contract-model', promptTokens: 100, completionTokens: 20, costUsd: 0.25, source: 'contract', fallback: true }],
  })
  check(near(committed.spentUsd, 0.25) && near(committed.reservedUsd, 0), 'commit replaces the reservation with the real spend')
  const seen = await store.window({ tenant: a, capUsd: 1, windowKey })
  check(near(seen.spentUsd, 0.25) && near(seen.utilization ?? -1, 0.25), 'window reports committed spend and utilization')
  const other = await store.window({ tenant: a, capUsd: 1, windowKey: 'contract-next' })
  check(other.spentUsd === 0 && other.reservedUsd === 0, 'accounting windows are independent')

  const c = tenant('cap')
  const concurrency = options.concurrency ?? 50
  const capUsd = 1
  const amountUsd = 0.07
  const raced = await Promise.all(Array.from({ length: concurrency }, (_, index) =>
    store.reserve({ tenant: c, reservationId: `race-${index}`, amountUsd, capUsd, windowKey })))
  const admitted = raced.filter(result => result.ok).length
  const held = await store.window({ tenant: c, capUsd, windowKey })
  check(held.reservedUsd <= capUsd + 1e-9, `concurrent reservations never exceed the cap (reserved ${held.reservedUsd})`)
  check(admitted === Math.min(concurrency, Math.floor(capUsd / amountUsd)), `exactly the reservations that fit are admitted (${admitted})`)
  check(near(held.reservedUsd, admitted * amountUsd), 'reserved total equals the admitted reservations')
  const denied = await store.reserve({ tenant: c, reservationId: 'over', amountUsd: 5, capUsd, windowKey })
  check(!denied.ok && denied.reason === 'quota_exceeded', 'a reservation over the cap is denied')
  check(near((await store.window({ tenant: c, windowKey })).reservedUsd, held.reservedUsd), 'a denied reservation holds nothing')

  const i = tenant('idempotency')
  const replays = await Promise.all(Array.from({ length: 10 }, () =>
    store.reserve({ tenant: i, reservationId: 'same', amountUsd: 0.1, capUsd: 1, windowKey })))
  check(replays.every(result => result.ok), 'a repeated reservation id replays the first outcome')
  check(near((await store.window({ tenant: i, windowKey })).reservedUsd, 0.1), 'a repeated reservation id is counted once')
  await Promise.all(Array.from({ length: 5 }, () => store.commit({ tenant: i, reservationId: 'same', actualUsd: 0.05 })))
  const once = await store.window({ tenant: i, windowKey })
  check(near(once.spentUsd, 0.05) && near(once.reservedUsd, 0), 'a repeated commit is counted once')

  const s = tenant('settlement')
  await store.reserve({ tenant: s, reservationId: 'released', amountUsd: 0.2, windowKey })
  await store.release({ tenant: s, reservationId: 'released' })
  const again = await store.release({ tenant: s, reservationId: 'released' })
  check(near(again.reservedUsd, 0) && near(again.spentUsd, 0), 'release returns the reservation and is idempotent')
  check(await rejectsWith('AK_COST_RESERVATION_RELEASED', () => store.commit({ tenant: s, reservationId: 'released', actualUsd: 0.2 })), 'commit after release is rejected')
  await store.reserve({ tenant: s, reservationId: 'committed', amountUsd: 0.2, windowKey })
  await store.commit({ tenant: s, reservationId: 'committed', actualUsd: 0.3 })
  check(await rejectsWith('AK_COST_RESERVATION_COMMITTED', () => store.release({ tenant: s, reservationId: 'committed' })), 'release after commit is rejected')
  check(await rejectsWith('AK_COST_RESERVATION_NOT_FOUND', () => store.commit({ tenant: s, reservationId: 'unknown', actualUsd: 0 })), 'commit of an unknown reservation is rejected')
  check(await rejectsWith('AK_COST_RESERVATION_NOT_FOUND', () => store.release({ tenant: s, reservationId: 'unknown' })), 'release of an unknown reservation is rejected')
  check(near((await store.window({ tenant: s, windowKey })).spentUsd, 0.3), 'actual spend may exceed the reserved estimate')

  const x = tenant('isolation-a')
  const y = tenant('isolation-b')
  await store.reserve({ tenant: x, reservationId: 'shared-id', amountUsd: 0.9, capUsd: 1, windowKey })
  const neighbour = await store.reserve({ tenant: y, reservationId: 'own-id', amountUsd: 0.9, capUsd: 1, windowKey })
  check(neighbour.ok && near(neighbour.window.reservedUsd, 0.9), 'tenants do not share caps')
  const sameId = await store.reserve({ tenant: y, reservationId: 'shared-id', amountUsd: 0.05, capUsd: 1, windowKey })
  check(sameId.ok && near(sameId.window.reservedUsd, 0.95), 'tenants do not share reservation ids')
  check(near((await store.window({ tenant: x, windowKey })).reservedUsd, 0.9), 'a reservation only changes its own tenant')
  check(await rejectsWith('AK_COST_RESERVATION_NOT_FOUND', () => store.commit({ tenant: tenant('isolation-c'), reservationId: 'shared-id', actualUsd: 0 })), 'a tenant cannot settle another tenant\'s reservation')

  const r = tenant('release')
  const turns = options.turns ?? 100
  let expected = 0
  await Promise.all(Array.from({ length: turns }, async (_, index) => {
    const reservationId = `turn-${index}`
    const reserved = await store.reserve({ tenant: r, reservationId, amountUsd: 0.01, capUsd: turns, windowKey })
    check(reserved.ok, 'turn reservation is admitted')
    if (index % 5 === 0) {
      await store.release({ tenant: r, reservationId })
      return
    }
    const actualUsd = 0.001 * ((index % 7) + 1)
    expected += actualUsd
    await store.commit({ tenant: r, reservationId, actualUsd, usage: [{ model: 'contract-model', promptTokens: index, completionTokens: 1, costUsd: actualUsd }] })
  }))
  const settled = await store.window({ tenant: r, windowKey })
  check(near(settled.reservedUsd, 0), 'failed turns release their reservations')
  check(near(settled.spentUsd, expected), `spend equals the committed turns (${settled.spentUsd} vs ${expected})`)

  return { accounting: 'passed', cap: 'passed', idempotency: 'passed', settlement: 'passed', isolation: 'passed', release: 'passed' }
}
