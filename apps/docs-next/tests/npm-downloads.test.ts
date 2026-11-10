import { describe, expect, it } from 'vitest'
import { PACKAGE_NAMES, dateChunks, sumDays } from '../lib/npm-downloads'

describe('npm download aggregation', () => {
  it('uses 36 distinct packages and non-overlapping inclusive API windows', () => {
    expect(PACKAGE_NAMES).toHaveLength(36)
    expect(new Set(PACKAGE_NAMES).size).toBe(36)
    expect(dateChunks('2026-04-05', '2027-04-05')).toEqual([
      { start: '2026-04-05', end: '2027-04-04' },
      { start: '2027-04-05', end: '2027-04-05' },
    ])
  })

  it('counts each daily value only inside the selected inclusive period', () => {
    const days = [
      { day: '2026-04-05', downloads: 2 },
      { day: '2026-04-06', downloads: 3 },
      { day: '2026-04-07', downloads: 5 },
    ]
    expect(sumDays(days, '2026-04-06', '2026-04-07')).toBe(8)
  })
})
