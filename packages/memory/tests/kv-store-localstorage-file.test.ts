import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals() })

describe('localStorage file fallback atomic persistence', () => {
  it('fails closed on corrupt JSON without replacing bytes or leaving a temp file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agentskit-localstorage-corrupt-'))
    const filePath = join(directory, 'memory.json')
    const original = '{"broken":'
    await writeFile(filePath, original, 'utf8')
    try {
      const { createLocalStorageStore } = await import('../src/kv-store-basic')
      const store = createLocalStorageStore({
        config: { backend: 'localstorage', key: 'legacy' }, storage: undefined, filePath,
      })
      await expect(store.get('broken')).rejects.toThrow()
      await expect(store.set('new', 'value')).rejects.toThrow()
      expect(await readFile(filePath, 'utf8')).toBe(original)
      expect(await readdir(directory)).toEqual(['memory.json'])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('fails closed on corrupt native localStorage JSON without replacing bytes', async () => {
    const original = '{"broken":'
    const values = new Map([['legacy', original]])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }
    const { createLocalStorageStore } = await import('../src/kv-store-basic')
    const store = createLocalStorageStore({ config: { backend: 'localstorage', key: 'legacy' }, storage })
    await expect(store.get('broken')).rejects.toThrow()
    await expect(store.set('new', 'value')).rejects.toThrow()
    expect(values.get('legacy')).toBe(original)
  })

  it('preserves original bytes and removes its temp file when rename fails', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agentskit-localstorage-fallback-'))
    const filePath = join(directory, 'memory.json')
    const original = '{"legacy":{"value":"keep","insertedAt":1}}'
    await writeFile(filePath, original, 'utf8')
    vi.stubGlobal('localStorage', undefined)
    vi.resetModules()
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
      return {
        ...actual,
        rename: vi.fn(async () => { throw new Error('injected fallback rename failure') }),
      }
    })

    try {
      const { createLocalStorageStore } = await import('../src/kv-store-basic')
      const store = createLocalStorageStore({
        config: { backend: 'localstorage', key: 'legacy' },
        storage: undefined,
        filePath,
      })
      await expect(store.set('new', 'value')).rejects.toThrow('injected fallback rename failure')
      expect(await readFile(filePath, 'utf8')).toBe(original)
      expect(await readdir(directory)).toEqual(['memory.json'])
    } finally {
      vi.doUnmock('node:fs/promises')
      vi.resetModules()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
