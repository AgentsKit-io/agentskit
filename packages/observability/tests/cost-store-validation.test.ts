import { describe, expect, it } from 'vitest'
import {
  validateCostCommit,
  validateCostRelease,
  validateCostReserve,
  validateCostWindow,
  validateReservationTtl,
  validateWarnAtUtilization,
} from '../src/cost-store-validation'

const invalid = { code: 'AK_CONFIG_INVALID' }

describe('cost store validation', () => {
  it('accepts well-formed inputs', () => {
    expect(() => validateCostReserve({ tenant: 't', reservationId: 'r', amountUsd: 0, capUsd: 1, warnAtUtilization: 0.8 })).not.toThrow()
    expect(() => validateCostCommit({ tenant: 't', reservationId: 'r', actualUsd: 0.1, usage: [{ model: 'm', promptTokens: 1, completionTokens: 2, costUsd: 0.1 }] })).not.toThrow()
    expect(() => validateCostRelease({ tenant: 't', reservationId: 'r' })).not.toThrow()
    expect(() => validateCostWindow({ tenant: 't' })).not.toThrow()
    expect(() => validateReservationTtl(undefined)).not.toThrow()
    expect(() => validateWarnAtUtilization(undefined)).not.toThrow()
  })

  it('rejects blank keys, negative or non-finite amounts and bad thresholds', () => {
    expect(() => validateCostReserve({ tenant: ' ', reservationId: 'r', amountUsd: 1 })).toThrow(expect.objectContaining(invalid))
    expect(() => validateCostReserve({ tenant: 't', reservationId: 'r', amountUsd: -1 })).toThrow(expect.objectContaining(invalid))
    expect(() => validateCostCommit({ tenant: 't', reservationId: 'r', actualUsd: 1, usage: [{ model: 'm', promptTokens: Number.NaN, completionTokens: 0, costUsd: 0 }] })).toThrow(expect.objectContaining(invalid))
    expect(() => validateCostRelease({ tenant: 't', reservationId: '' })).toThrow(expect.objectContaining(invalid))
    expect(() => validateCostWindow({ tenant: 't', capUsd: Number.POSITIVE_INFINITY })).toThrow(expect.objectContaining(invalid))
    expect(() => validateReservationTtl(0)).toThrow(expect.objectContaining(invalid))
    expect(() => validateWarnAtUtilization(0)).toThrow(expect.objectContaining(invalid))
  })
})
