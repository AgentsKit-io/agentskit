import { describe, expect, it } from 'vitest'
import { ConfigError } from '@agentskit/core'
import { validateCostCount, validateReservationTtl } from '../src/cost-store-validate'

describe('cost store validation', () => {
  it('requires a tenant and a kind to count', () => {
    expect(() => validateCostCount({ tenant: 't', kind: 'describe' })).not.toThrow()
    expect(() => validateCostCount({ tenant: '', kind: 'describe' })).toThrow(ConfigError)
    expect(() => validateCostCount({ tenant: 't', kind: ' ' })).toThrow(ConfigError)
  })

  it('rejects a non-positive reservation TTL', () => {
    expect(() => validateReservationTtl(undefined)).not.toThrow()
    expect(() => validateReservationTtl(0)).toThrow(ConfigError)
  })
})
