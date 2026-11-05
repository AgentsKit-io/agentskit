// Input validation shared by every `CostStore` implementation. Internal: re-exported through `./cost-store`.
import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { CostCommitInput, CostReleaseInput, CostReserveInput, CostWindowInput } from './cost-store'

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

/** Validate `CostStoreOptions.reservationTtlMs`; shared by every `CostStore` implementation. */
export function validateReservationTtl(reservationTtlMs: number | undefined): void {
  if (reservationTtlMs === undefined) return
  if (!Number.isFinite(reservationTtlMs) || reservationTtlMs <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `cost store: reservationTtlMs must be a finite number > 0 (received ${String(reservationTtlMs)})`,
      hint: 'Pass the reservation lifetime in milliseconds, longer than your slowest call, or omit it.',
    })
  }
}

export function validateWarnAtUtilization(warnAtUtilization: number | undefined): void {
  if (warnAtUtilization === undefined) return
  if (!Number.isFinite(warnAtUtilization) || warnAtUtilization <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `cost store: warnAtUtilization must be a finite number > 0 (received ${String(warnAtUtilization)})`,
      hint: 'Pass the warning threshold as a fraction of the cap, for example 0.8 for 80 %.',
    })
  }
}

/** Validate a reserve input; shared by every `CostStore` implementation. */
export function validateCostReserve(input: CostReserveInput): void {
  assertKey('tenant', input.tenant)
  assertKey('reservationId', input.reservationId)
  assertUsd('amountUsd', input.amountUsd)
  if (input.capUsd !== undefined) assertUsd('capUsd', input.capUsd)
  validateWarnAtUtilization(input.warnAtUtilization)
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
  validateWarnAtUtilization(input.warnAtUtilization)
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
