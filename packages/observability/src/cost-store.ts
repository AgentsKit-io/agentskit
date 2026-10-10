import { AgentsKitError, ConfigError, ErrorCodes } from '@agentskit/core'

/** One priced model call, written to the usage ledger when a reservation is committed. */
export interface CostUsageEntry {
  model: string
  promptTokens: number
  completionTokens: number
  costUsd: number
  /** Free-form origin of the call (`'chat'`, `'extraction'`, a route name). */
  source?: string
  /** True when the call ran on a fallback model. */
  fallback?: boolean
}

/** Durable spend state of one tenant in one accounting window. */
export interface CostWindow {
  tenant: string
  windowKey: string
  /** Committed spend in USD. */
  spentUsd: number
  /** Reserved, not yet committed or released, in USD. */
  reservedUsd: number
  /** Cap this window was evaluated against, when one was supplied. */
  capUsd?: number
  /** `capUsd - spentUsd - reservedUsd`, never negative. */
  remainingUsd?: number
  /** `(spentUsd + reservedUsd) / capUsd`, always finite. */
  utilization?: number
}

/** Input of `CostStore.reserve`. */
export interface CostReserveInput {
  tenant: string
  /** Caller-chosen idempotency key, unique per tenant. Reusing it replays the first outcome. */
  reservationId: string
  /** Upper estimate of the spend to hold, in USD. */
  amountUsd: number
  /** Tenant cap for the window, in USD. Omit to hold the amount without a ceiling. */
  capUsd?: number
  /** Accounting window. Defaults to the store's current window. */
  windowKey?: string
}

/** Outcome of `CostStore.reserve`. A denied reservation holds nothing. */
export type CostReserveResult =
  | { ok: true; reservationId: string; window: CostWindow }
  | { ok: false; reason: 'quota_exceeded'; window: CostWindow }

/** Input of `CostStore.commit`. */
export interface CostCommitInput {
  tenant: string
  reservationId: string
  /** Real spend in USD. Replaces the reserved amount, and may exceed it. */
  actualUsd: number
  /** Ledger rows for the calls that produced `actualUsd`. */
  usage?: readonly CostUsageEntry[]
}

/** Input of `CostStore.release`. */
export interface CostReleaseInput {
  tenant: string
  reservationId: string
}

/** Input of `CostStore.window`. */
export interface CostWindowInput {
  tenant: string
  capUsd?: number
  windowKey?: string
}

/**
 * Durable, tenant-scoped spend accounting. `reserve` holds an estimate
 * atomically against the cap, `commit` replaces it with the real spend, and
 * `release` returns it when the call fails. All three are idempotent per
 * `reservationId`: a repeated call returns the current window without counting twice.
 */
export interface CostStore {
  reserve: (input: CostReserveInput) => Promise<CostReserveResult>
  commit: (input: CostCommitInput) => Promise<CostWindow>
  release: (input: CostReleaseInput) => Promise<CostWindow>
  window: (input: CostWindowInput) => Promise<CostWindow>
}

/** Options shared by the bundled `CostStore` implementations. */
export interface CostStoreOptions {
  /** Maps the current time to an accounting window. Defaults to the UTC month (`2026-10`). */
  windowKey?: (now: Date) => string
  /** Clock override for tests. */
  now?: () => Date
}

const RESERVATION_ERRORS = {
  AK_COST_RESERVATION_NOT_FOUND: 'does not exist',
  AK_COST_RESERVATION_RELEASED: 'was already released',
  AK_COST_RESERVATION_COMMITTED: 'was already committed',
} as const

/**
 * Thrown when an operation targets a reservation the store cannot settle.
 * Match it by `code`: the CommonJS build of each subpath carries its own copy of
 * this class, so `instanceof` fails across `require` entry points.
 */
export class CostReservationError extends AgentsKitError {
  declare readonly code: keyof typeof RESERVATION_ERRORS

  constructor(code: keyof typeof RESERVATION_ERRORS, reservationId: string) {
    super({
      code,
      message: `cost store: reservation ${JSON.stringify(reservationId)} ${RESERVATION_ERRORS[code]}`,
      hint: 'Settle each reservation once: commit it after the call succeeds or release it when the call fails.',
    })
    this.name = 'CostReservationError'
  }
}

/** UTC calendar month of `now`, formatted `YYYY-MM`. */
export function monthlyWindowKey(now: Date): string {
  return now.toISOString().slice(0, 7)
}

/** Build a `CostWindow`, deriving `remainingUsd` and `utilization` when a cap is known. */
export function describeCostWindow(
  tenant: string,
  windowKey: string,
  spentUsd: number,
  reservedUsd: number,
  capUsd: number | undefined,
): CostWindow {
  if (capUsd === undefined) return { tenant, windowKey, spentUsd, reservedUsd }
  const used = spentUsd + reservedUsd
  const ratio = capUsd > 0 ? used / capUsd : Math.sign(used)
  return {
    tenant,
    windowKey,
    spentUsd,
    reservedUsd,
    capUsd,
    remainingUsd: Math.max(0, capUsd - used),
    utilization: Number.isFinite(ratio) ? ratio : 1,
  }
}

function assertKey(name: string, value: string): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `cost store: ${name} must be a non-empty string`,
      hint: 'Pass the authenticated tenant id and a unique reservation id.',
    })
  }
}

function assertUsd(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `cost store: ${name} must be a finite number ≥ 0 (received ${String(value)})`,
      hint: 'Pass amounts and caps in USD as finite non-negative numbers.',
    })
  }
}

/** Validate a reserve input; shared by every `CostStore` implementation. */
export function validateCostReserve(input: CostReserveInput): void {
  assertKey('tenant', input.tenant)
  assertKey('reservationId', input.reservationId)
  assertUsd('amountUsd', input.amountUsd)
  if (input.capUsd !== undefined) assertUsd('capUsd', input.capUsd)
}

/** Validate a release input; shared by every `CostStore` implementation. */
export function validateCostRelease(input: CostReleaseInput): void {
  assertKey('tenant', input.tenant)
  assertKey('reservationId', input.reservationId)
}

/** Validate a window input; shared by every `CostStore` implementation. */
export function validateCostWindow(input: CostWindowInput): void {
  assertKey('tenant', input.tenant)
  if (input.capUsd !== undefined) assertUsd('capUsd', input.capUsd)
}

/** Validate a commit input; shared by every `CostStore` implementation. */
export function validateCostCommit(input: CostCommitInput): void {
  assertKey('tenant', input.tenant)
  assertKey('reservationId', input.reservationId)
  assertUsd('actualUsd', input.actualUsd)
  for (const entry of input.usage ?? []) {
    assertKey('usage.model', entry.model)
    assertUsd('usage.promptTokens', entry.promptTokens)
    assertUsd('usage.completionTokens', entry.completionTokens)
    assertUsd('usage.costUsd', entry.costUsd)
  }
}

// USD is tracked in integer nano-dollars so repeated sums stay exact.
const NANO = 1e9
const toNano = (usd: number): number => Math.round(usd * NANO)

interface MemoryReservation {
  windowKey: string
  amount: number
  status: 'reserved' | 'committed' | 'released'
}

/** A ledger row as kept by `createInMemoryCostStore`. */
export interface InMemoryLedgerRow extends CostUsageEntry {
  tenant: string
  reservationId: string
}

/** `CostStore` plus the ledger rows written by `commit`, for assertions in tests. */
export interface InMemoryCostStore extends CostStore {
  ledger: () => InMemoryLedgerRow[]
}

/**
 * Process-local `CostStore` for development and tests. State is lost on restart
 * and is not shared between instances or isolates; use a durable store in production.
 */
export function createInMemoryCostStore(options: CostStoreOptions = {}): InMemoryCostStore {
  const keyOf = options.windowKey ?? monthlyWindowKey
  const now = options.now ?? (() => new Date())
  const windows = new Map<string, { spent: number; reserved: number }>()
  const reservations = new Map<string, MemoryReservation>()
  const ledger: InMemoryLedgerRow[] = []

  const windowOf = (tenant: string, windowKey: string) => {
    const id = JSON.stringify([tenant, windowKey])
    let state = windows.get(id)
    if (!state) {
      state = { spent: 0, reserved: 0 }
      windows.set(id, state)
    }
    return state
  }
  const describe = (tenant: string, windowKey: string, capUsd?: number): CostWindow => {
    const state = windowOf(tenant, windowKey)
    return describeCostWindow(tenant, windowKey, state.spent / NANO, state.reserved / NANO, capUsd)
  }
  const find = (tenant: string, reservationId: string): MemoryReservation => {
    const reservation = reservations.get(JSON.stringify([tenant, reservationId]))
    if (!reservation) throw new CostReservationError('AK_COST_RESERVATION_NOT_FOUND', reservationId)
    return reservation
  }

  return {
    async reserve(input) {
      validateCostReserve(input)
      const id = JSON.stringify([input.tenant, input.reservationId])
      const existing = reservations.get(id)
      if (existing) {
        // A released reservation holds nothing, so replaying it as admitted would let the call run unaccounted.
        if (existing.status === 'released') throw new CostReservationError('AK_COST_RESERVATION_RELEASED', input.reservationId)
        return { ok: true, reservationId: input.reservationId, window: describe(input.tenant, existing.windowKey, input.capUsd) }
      }
      const windowKey = input.windowKey ?? keyOf(now())
      const state = windowOf(input.tenant, windowKey)
      const amount = toNano(input.amountUsd)
      if (input.capUsd !== undefined && state.spent + state.reserved + amount > toNano(input.capUsd)) {
        return { ok: false, reason: 'quota_exceeded', window: describe(input.tenant, windowKey, input.capUsd) }
      }
      state.reserved += amount
      reservations.set(id, { windowKey, amount, status: 'reserved' })
      return { ok: true, reservationId: input.reservationId, window: describe(input.tenant, windowKey, input.capUsd) }
    },
    async commit(input) {
      validateCostCommit(input)
      const reservation = find(input.tenant, input.reservationId)
      if (reservation.status === 'released') throw new CostReservationError('AK_COST_RESERVATION_RELEASED', input.reservationId)
      if (reservation.status === 'reserved') {
        const state = windowOf(input.tenant, reservation.windowKey)
        state.reserved -= reservation.amount
        state.spent += toNano(input.actualUsd)
        reservation.status = 'committed'
        for (const entry of input.usage ?? []) ledger.push({ ...entry, tenant: input.tenant, reservationId: input.reservationId })
      }
      return describe(input.tenant, reservation.windowKey)
    },
    async release(input) {
      validateCostRelease(input)
      const reservation = find(input.tenant, input.reservationId)
      if (reservation.status === 'committed') throw new CostReservationError('AK_COST_RESERVATION_COMMITTED', input.reservationId)
      if (reservation.status === 'reserved') {
        windowOf(input.tenant, reservation.windowKey).reserved -= reservation.amount
        reservation.status = 'released'
      }
      return describe(input.tenant, reservation.windowKey)
    },
    async window(input) {
      validateCostWindow(input)
      return describe(input.tenant, input.windowKey ?? keyOf(now()), input.capUsd)
    },
    ledger: () => ledger.map(row => ({ ...row })),
  }
}

/** Spend that already happened and must be written to a `CostStore` by an observer. */
export interface CostSpendRecord {
  tenant: string
  costUsd: number
  usage?: readonly CostUsageEntry[]
}

/**
 * Record spend that already happened: reserve it without a ceiling, then commit
 * it, and return the resulting window. Cost guards use this after each priced call.
 * When the commit fails, the hold is released before the error is rethrown, so a
 * failed write does not leave the amount reserved.
 */
export async function recordCostSpend(store: CostStore, record: CostSpendRecord): Promise<CostWindow> {
  const reservationId = `spend-${globalThis.crypto.randomUUID()}`
  await store.reserve({ tenant: record.tenant, reservationId, amountUsd: record.costUsd })
  try {
    return await store.commit({ tenant: record.tenant, reservationId, actualUsd: record.costUsd, usage: record.usage })
  } catch (error) {
    // Best effort: when the store is unreachable the release fails too, and the reservation is left for expiry.
    await store.release({ tenant: record.tenant, reservationId }).catch(() => {})
    throw error
  }
}

const warned = new Set<string>()

/** True for `NODE_ENV=production`, and for Cloudflare Workers when `NODE_ENV` is not set (isolates expose no `process.env` by default). */
function looksLikeProduction(): boolean {
  const scope = globalThis as { process?: { env?: Record<string, string | undefined> }; navigator?: { userAgent?: string } }
  const nodeEnv = scope.process?.env?.NODE_ENV
  if (nodeEnv !== undefined) return nodeEnv === 'production'
  return scope.navigator?.userAgent === 'Cloudflare-Workers'
}

/**
 * Warn once per guard when it runs without a `CostStore`: its totals then live
 * in process memory and do not hold across instances.
 * @param scope Guard name used in the message.
 * @param warn `true` always warns, `false` never does; by default it warns in production runtimes.
 */
export function warnProcessLocalCostState(scope: string, warn?: boolean): void {
  if (!(warn ?? looksLikeProduction()) || warned.has(scope)) return
  warned.add(scope)
  console.warn(`[agentskit] ${scope}: no CostStore configured. Spend is tracked in process memory, so budgets reset on restart and are not shared between instances or isolates. Pass a durable \`store\`.`)
}
