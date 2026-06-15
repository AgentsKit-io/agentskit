import { describe, expect, it } from 'vitest'
import { createInMemoryStore, createLocalStorageStore, type LocalStorageLike } from '../src/index'

describe('createInMemoryStore', () => {
  it('round-trips and evicts by maxMessages', async () => {
    const s = createInMemoryStore({ backend: 'in-memory', maxMessages: 2 })
    await s.set('a', 1)
    await s.set('b', 2)
    await s.set('c', 3)
    expect(await s.get('a')).toBeUndefined()
    expect(await s.get('c')).toBe(3)
    expect(s.id).toBe('in-memory')
  })
})

describe('createLocalStorageStore', () => {
  it('persists through an injected storage', async () => {
    const backing = new Map<string, string>()
    const storage: LocalStorageLike = {
      getItem: (k) => backing.get(k) ?? null,
      setItem: (k, v) => void backing.set(k, v),
    }
    const s = createLocalStorageStore({ config: { backend: 'localstorage', key: 'mem' }, storage })
    await s.set('x', { n: 1 })
    expect(await s.get('x')).toEqual({ n: 1 })
    expect(backing.has('mem')).toBe(true)
  })
})
