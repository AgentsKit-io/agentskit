import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createFileStore,
  createInMemoryStore,
  createLocalStorageStore,
  type LocalStorageLike,
} from '../src/index'

let counter = 0
const tmpPath = (): string => join(tmpdir(), `ak-kv-${process.pid}-${counter++}.json`)

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

  it('returns undefined for a missing key', async () => {
    const s = createInMemoryStore({ backend: 'in-memory' })
    expect(await s.get('nope')).toBeUndefined()
  })

  it('expires entries past their ttl', async () => {
    vi.useFakeTimers()
    try {
      const s = createInMemoryStore({ backend: 'in-memory', ttlSeconds: 1 })
      await s.set('k', 'v')
      expect(await s.get('k')).toBe('v')
      vi.advanceTimersByTime(2000)
      expect(await s.get('k')).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('createFileStore', () => {
  const paths: string[] = []
  afterEach(async () => {
    await Promise.all(paths.splice(0).map((p) => rm(p, { force: true })))
  })

  it('persists across instances', async () => {
    const path = tmpPath()
    paths.push(path)
    const a = createFileStore({ backend: 'file', path })
    await a.set('x', { n: 1 })
    expect(a.id).toBe(`file:${path}`)
    // a fresh instance reads the persisted file
    const b = createFileStore({ backend: 'file', path })
    expect(await b.get('x')).toEqual({ n: 1 })
  })

  it('returns undefined for a missing file (ENOENT) and missing key', async () => {
    const path = tmpPath()
    paths.push(path)
    const s = createFileStore({ backend: 'file', path })
    expect(await s.get('absent')).toBeUndefined()
  })

  it('evicts by maxMessages and expires by ttl', async () => {
    vi.useFakeTimers()
    const path = tmpPath()
    paths.push(path)
    try {
      const s = createFileStore({ backend: 'file', path, maxMessages: 1, ttlSeconds: 1 })
      await s.set('a', 1)
      await s.set('b', 2)
      expect(await s.get('a')).toBeUndefined() // evicted
      expect(await s.get('b')).toBe(2)
      vi.advanceTimersByTime(2000)
      expect(await s.get('b')).toBeUndefined() // expired (and re-persisted)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('createLocalStorageStore', () => {
  const paths: string[] = []
  afterEach(async () => {
    await Promise.all(paths.splice(0).map((p) => rm(p, { force: true })))
  })

  it('persists through an injected storage', async () => {
    const backing = new Map<string, string>()
    const storage: LocalStorageLike = {
      getItem: (k) => backing.get(k) ?? null,
      setItem: (k, v) => void backing.set(k, v),
    }
    const s = createLocalStorageStore({ config: { backend: 'localstorage', key: 'mem' }, storage })
    await s.set('x', { n: 1 })
    expect(await s.get('x')).toEqual({ n: 1 })
    expect(s.id).toBe('localstorage:mem')
    expect(backing.has('mem')).toBe(true)
  })

  it('falls back to a file when no storage is available', async () => {
    const filePath = tmpPath()
    paths.push(filePath)
    const s = createLocalStorageStore({
      config: { backend: 'localstorage', key: 'mem' },
      storage: undefined,
      filePath,
    })
    await s.set('y', 2)
    expect(s.id).toBe(`localstorage-file:${filePath}:mem`)
    const reopened = createLocalStorageStore({
      config: { backend: 'localstorage', key: 'mem' },
      storage: undefined,
      filePath,
    })
    expect(await reopened.get('y')).toBe(2)
  })

  it('expires entries past their ttl (injected storage)', async () => {
    vi.useFakeTimers()
    try {
      const backing = new Map<string, string>()
      const storage: LocalStorageLike = {
        getItem: (k) => backing.get(k) ?? null,
        setItem: (k, v) => void backing.set(k, v),
      }
      const s = createLocalStorageStore({ config: { backend: 'localstorage', key: 'm', ttlSeconds: 1 }, storage })
      await s.set('k', 'v')
      vi.advanceTimersByTime(2000)
      expect(await s.get('k')).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })
})
