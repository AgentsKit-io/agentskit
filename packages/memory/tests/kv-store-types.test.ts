import { describe, expect, it } from 'vitest'
import { enforceMaxMessages, isExpired, type KvEntry } from '../src/kv-store-types'

describe('isExpired', () => {
  it('is false when no ttl', () => {
    expect(isExpired({ value: 1, insertedAt: 0 }, undefined, 10_000)).toBe(false)
  })
  it('is true past ttl', () => {
    expect(isExpired({ value: 1, insertedAt: 0 }, 5, 6_000)).toBe(true)
    expect(isExpired({ value: 1, insertedAt: 0 }, 5, 4_000)).toBe(false)
  })
})

describe('enforceMaxMessages', () => {
  it('evicts oldest (insertion order) beyond the cap', () => {
    const m = new Map<string, KvEntry>([
      ['a', { value: 1, insertedAt: 1 }],
      ['b', { value: 2, insertedAt: 2 }],
      ['c', { value: 3, insertedAt: 3 }],
    ])
    enforceMaxMessages(m, 2)
    expect([...m.keys()]).toEqual(['b', 'c'])
  })
  it('no-op without a cap', () => {
    const m = new Map<string, KvEntry>([['a', { value: 1, insertedAt: 1 }]])
    enforceMaxMessages(m, undefined)
    expect(m.size).toBe(1)
  })
})
