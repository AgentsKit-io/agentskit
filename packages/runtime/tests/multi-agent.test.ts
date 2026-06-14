import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TOPOLOGY_CONCURRENCY,
  InMemoryScratchpadStore,
  resolveConcurrency,
  settleWithConcurrency,
} from '../src/index'

describe('settleWithConcurrency', () => {
  it('preserves input order and caps concurrency', async () => {
    let inFlight = 0
    let peak = 0
    const out = await settleWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await Promise.resolve()
      inFlight -= 1
      return n * 10
    })
    expect(out.map((r) => (r.status === 'fulfilled' ? r.value : null))).toEqual([10, 20, 30, 40, 50])
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('captures per-item rejections without failing the batch', async () => {
    const out = await settleWithConcurrency([1, 2], 2, async (n) => {
      if (n === 2) throw new Error('boom')
      return n
    })
    expect(out[0]).toEqual({ status: 'fulfilled', value: 1 })
    expect(out[1]?.status).toBe('rejected')
  })
})

describe('resolveConcurrency', () => {
  it('falls back to the default for invalid limits', () => {
    expect(resolveConcurrency(undefined)).toBe(DEFAULT_TOPOLOGY_CONCURRENCY)
    expect(resolveConcurrency(0)).toBe(DEFAULT_TOPOLOGY_CONCURRENCY)
    expect(resolveConcurrency(-3)).toBe(DEFAULT_TOPOLOGY_CONCURRENCY)
    expect(resolveConcurrency(4)).toBe(4)
  })
})

describe('InMemoryScratchpadStore', () => {
  it('stores and lists entries', () => {
    const s = new InMemoryScratchpadStore()
    s.set('a', 1)
    s.set('b', 2)
    expect(s.get('a')).toBe(1)
    expect(s.entries()).toEqual([['a', 1], ['b', 2]])
  })
})
