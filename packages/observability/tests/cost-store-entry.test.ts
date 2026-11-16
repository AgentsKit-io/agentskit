import { describe, expect, it } from 'vitest'
import * as entry from '../src/cost-store-entry'

describe('cost-store entry', () => {
  it('exposes the node-free cost store surface', () => {
    expect(typeof entry.multiTenantCostGuard).toBe('function')
    expect(typeof entry.createInMemoryCostStore).toBe('function')
    expect(typeof entry.monthlyWindowKey).toBe('function')
    expect(typeof entry.CostReservationError).toBe('function')
  })
})
