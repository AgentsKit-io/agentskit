import { describe, expect, it } from 'vitest'
import { isTrackingAllowed } from './analytics-privacy'

describe('docs analytics privacy', () => {
  it('blocks tracking when Do Not Track is enabled', () => {
    expect(isTrackingAllowed('1')).toBe(false)
  })

  it('allows tracking when Do Not Track is disabled or unspecified', () => {
    expect(isTrackingAllowed('0')).toBe(true)
    expect(isTrackingAllowed(undefined)).toBe(true)
  })

  it('allows explicit opt-in even when Do Not Track is enabled', () => {
    expect(isTrackingAllowed('1', true)).toBe(true)
  })
})
