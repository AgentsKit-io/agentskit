import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
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
    await Promise.all(paths.splice(0).map((p) => rm(p, { force: true, recursive: true })))
  })

  it('does not replace a corrupt regular file or leave a temp file on failed writes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ak-kv-'))
    const path = join(directory, 'memory.json')
    paths.push(directory)
    const original = '{"broken":'
    await writeFile(path, original, 'utf8')
    const store = createFileStore({ backend: 'file', path })
    await expect(store.get('broken')).rejects.toThrow()
    await expect(store.set('new', 'value')).rejects.toThrow()
    expect(await readFile(path, 'utf8')).toBe(original)
    expect(await readdir(directory)).toEqual(['memory.json'])
  })

  it('preserves valid sibling entries when atomic file replacement fails', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ak-kv-'))
    const path = join(directory, 'memory.json')
    paths.push(directory)
    const original = JSON.stringify({ keep: { value: 'unrelated', insertedAt: 1 } })
    await writeFile(path, original, 'utf8')
    vi.resetModules()
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
      return { ...actual, rename: vi.fn(async () => { throw new Error('injected rename failure') }) }
    })
    try {
      const { createFileStore: create } = await import('../src/kv-store-basic')
      const store = create({ backend: 'file', path })
      await expect(store.set('new', 'value')).rejects.toThrow('injected rename failure')
      expect(await readFile(path, 'utf8')).toBe(original)
      expect(await readdir(directory)).toEqual(['memory.json'])
    } finally {
      vi.doUnmock('node:fs/promises')
      vi.resetModules()
    }
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

  it('serializes concurrent writes from multiple instances without stale snapshots', async () => {
    const path = tmpPath()
    paths.push(path)
    const a = createFileStore({ backend: 'file', path })
    const b = createFileStore({ backend: 'file', path })
    await Promise.all([a.set('a', 1), b.set('b', 2)])
    expect(await a.get('a')).toBe(1)
    expect(await b.get('b')).toBe(2)
  })

  it('keeps an existing destination intact and removes the temp file when atomic rename fails', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ak-kv-rename-'))
    const path = join(directory, 'memory.json')
    paths.push(directory)
    await mkdir(path, { recursive: true })
    await writeFile(join(path, 'keep.txt'), 'existing destination', 'utf8')

    const store = createFileStore({ backend: 'file', path })
    await expect(store.set('new', 'value')).rejects.toThrow()

    expect(await readFile(join(path, 'keep.txt'), 'utf8')).toBe('existing destination')
    expect(await readdir(directory)).toEqual(['memory.json'])
    expect(await readdir(path)).toEqual(['keep.txt'])
  })

  it('rejects invalid retention settings', () => {
    expect(() => createInMemoryStore({ backend: 'in-memory', maxMessages: 0 })).toThrow(/maxMessages/)
    expect(() => createInMemoryStore({ backend: 'in-memory', ttlSeconds: Number.NaN })).toThrow(/ttlSeconds/)
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
    await Promise.all(paths.splice(0).map((p) => rm(p, { force: true, recursive: true })))
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

  it('preserves distinct concurrent writes to synchronous storage', async () => {
    const backing = new Map<string, string>()
    const storage: LocalStorageLike = {
      getItem: k => backing.get(k) ?? null,
      setItem: (k, v) => { backing.set(k, v) },
    }
    const a = createLocalStorageStore({ config: { backend: 'localstorage', key: 'shared' }, storage })
    const b = createLocalStorageStore({ config: { backend: 'localstorage', key: 'shared' }, storage })
    await Promise.all(Array.from({ length: 100 }, (_, i) => (i % 2 ? a : b).set(`k${i}`, i)))
    await Promise.all(Array.from({ length: 100 }, async (_, i) => {
      expect(await a.get(`k${i}`)).toBe(i)
    }))
  })

  it('does not lose a new localStorage write when another instance purges an expired key', async () => {
    vi.useFakeTimers()
    try {
      const backing = new Map<string, string>()
      const storage: LocalStorageLike = {
        getItem: k => backing.get(k) ?? null,
        setItem: (k, v) => { backing.set(k, v) },
      }
      const a = createLocalStorageStore({ config: { backend: 'localstorage', key: 'shared-expiry', ttlSeconds: 1 }, storage })
      const b = createLocalStorageStore({ config: { backend: 'localstorage', key: 'shared-expiry', ttlSeconds: 1 }, storage })
      await a.set('expired', 'old')
      vi.advanceTimersByTime(2000)

      const expiredRead = a.get('expired')
      const concurrentWrite = b.set('new', 'live')
      await Promise.all([expiredRead, concurrentWrite])

      expect(await a.get('expired')).toBeUndefined()
      expect(await a.get('new')).toBe('live')
    } finally {
      vi.useRealTimers()
    }
  })
})
