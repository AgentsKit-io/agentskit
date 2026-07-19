import { describe, expect, it } from 'vitest'
import { defensiveSnapshot } from '../src/replay/clone'

describe('defensiveSnapshot', () => {
  it('clones plain objects and arrays deeply', () => {
    const src = { a: 1, b: [2, { c: 3 }], d: 'x' }
    const snap = defensiveSnapshot(src)
    expect(snap).toEqual(src)
    expect(snap).not.toBe(src)
    expect(snap.b).not.toBe(src.b)
    expect(snap.b[1]).not.toBe(src.b[1])
    snap.a = 99
    ;(snap.b[1] as { c: number }).c = 99
    expect(src.a).toBe(1)
    expect((src.b[1] as { c: number }).c).toBe(3)
  })

  it('clones Date by value', () => {
    const d = new Date('2020-01-01T00:00:00.000Z')
    const src = { when: d }
    const snap = defensiveSnapshot(src)
    expect(snap.when).toEqual(d)
    expect(snap.when).not.toBe(d)
    snap.when.setUTCFullYear(1999)
    expect(d.getUTCFullYear()).toBe(2020)
  })

  it('preserves functions and opaque objects by identity', () => {
    const fn = () => 1
    const map = new Map([['k', 1]])
    const src = { fn, map, n: 1 }
    const snap = defensiveSnapshot(src)
    expect(snap.fn).toBe(fn)
    expect(snap.map).toBe(map)
    expect(snap).not.toBe(src)
    expect(snap.n).toBe(1)
  })

  it('handles cycles without throwing', () => {
    const a: { self?: unknown; n: number } = { n: 1 }
    a.self = a
    const snap = defensiveSnapshot(a)
    expect(snap.n).toBe(1)
    expect(snap.self).toBe(snap)
    expect(snap).not.toBe(a)
  })

  it('returns primitives as-is', () => {
    expect(defensiveSnapshot(null)).toBe(null)
    expect(defensiveSnapshot(42)).toBe(42)
    expect(defensiveSnapshot('hi')).toBe('hi')
    expect(defensiveSnapshot(true)).toBe(true)
    expect(defensiveSnapshot(undefined)).toBe(undefined)
  })
})
