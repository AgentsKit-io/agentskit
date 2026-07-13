import { describe, expect, it, vi } from 'vitest'
import type { Message } from '@agentskit/core'
import { createWebStorageMemory, type WebStorageLike } from '../src/web-storage'

const message = (id: string, content = id): Message => ({
  id, role: 'user', content, status: 'complete', createdAt: new Date('2026-01-01T00:00:00.000Z'),
})

const storage = (initial: Readonly<Record<string, string>> = {}): WebStorageLike & { readonly values: Map<string, string> } => {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
  }
}

describe('createWebStorageMemory', () => {
  it('round-trips canonical messages and preserves ordering within retention', async () => {
    const backend = storage()
    const memory = createWebStorageMemory({ key: 'chat', getStorage: () => backend, maxMessages: 1 })
    await memory.save([message('one'), message('two')])
    await expect(memory.load()).resolves.toMatchObject([{ id: 'two', content: 'two' }])
  })

  it('removes an invalid canonical record and can continue to valid legacy data', async () => {
    const values = new Map([
      ['chat', JSON.stringify({ version: 1, messages: [{ role: 'assistant', content: {} }] })],
      ['legacy', JSON.stringify([{ id: 'old', role: 'user', text: 'hello' }])],
    ])
    const backend: WebStorageLike = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) },
      removeItem: () => { throw new DOMException('read only', 'SecurityError') },
    }
    const memory = createWebStorageMemory({
      key: 'chat', getStorage: () => backend,
      migration: { keys: ['legacy'], read: () => [message('old', 'hello')] },
    })
    await expect(memory.load()).resolves.toMatchObject([{ id: 'old', content: 'hello' }])
  })

  it('migrates a host-owned legacy record into canonical storage', async () => {
    const backend = storage({ legacy: JSON.stringify([{ id: 'old', role: 'user', text: 'hello' }]) })
    const memory = createWebStorageMemory({
      key: 'chat', getStorage: () => backend,
      migration: {
        keys: ['legacy'],
        read: value => Array.isArray(value) ? [message('old', String((value[0] as Record<string, unknown> | undefined)?.text ?? ''))] : undefined,
      },
    })
    await expect(memory.load()).resolves.toMatchObject([{ id: 'old', content: 'hello' }])
    expect(backend.values.has('legacy')).toBe(false)
    expect(backend.values.has('chat')).toBe(true)
  })

  it('keeps valid canonical and legacy data when storage is read-only', async () => {
    const canonical = JSON.stringify({ version: 1, messages: [{ ...message('safe'), createdAt: '2026-01-01T00:00:00.000Z' }] })
    const legacy = JSON.stringify([{ id: 'old' }])
    const values = new Map([['chat', canonical], ['legacy', legacy]])
    const backend: WebStorageLike = {
      getItem: key => values.get(key) ?? null,
      setItem: () => { throw new DOMException('full', 'QuotaExceededError') },
      removeItem: key => { values.delete(key) },
    }
    const memory = createWebStorageMemory({ key: 'chat', getStorage: () => backend, migration: { keys: ['legacy'], read: () => [message('old')] } })
    await expect(memory.load()).resolves.toMatchObject([{ id: 'safe' }])
    expect(values.get('chat')).toBe(canonical)
    expect(values.get('legacy')).toBe(legacy)
  })

  it('rejects oversized saves without changing the previous record', async () => {
    const backend = storage({ chat: 'previous' })
    const memory = createWebStorageMemory({ key: 'chat', getStorage: () => backend, maxRecordBytes: 256 })
    await expect(memory.save([message('large', '🧪'.repeat(256))])).rejects.toMatchObject({ code: 'AK_MEMORY_SAVE_FAILED' })
    expect(backend.values.get('chat')).toBe('previous')
  })

  it('rejects structurally invalid saves without changing the previous record', async () => {
    const backend = storage({ chat: 'previous' })
    const memory = createWebStorageMemory({ key: 'chat', getStorage: () => backend })
    await expect(memory.save([{ ...message('invalid'), content: {} } as unknown as Message]))
      .rejects.toMatchObject({ code: 'AK_MEMORY_SAVE_FAILED' })
    expect(backend.values.get('chat')).toBe('previous')
  })

  it('keeps legacy data when its migrated canonical record exceeds the byte limit', async () => {
    const legacy = JSON.stringify([{ id: 'old' }])
    const backend = storage({ legacy })
    const memory = createWebStorageMemory({
      key: 'chat', getStorage: () => backend, maxRecordBytes: 256,
      migration: { keys: ['legacy'], read: () => [message('old', '界'.repeat(256))] },
    })
    await expect(memory.load()).rejects.toMatchObject({ code: 'AK_MEMORY_SAVE_FAILED' })
    expect(backend.values.get('legacy')).toBe(legacy)
    expect(backend.values.has('chat')).toBe(false)
  })

  it('checks cancellation before each storage operation and is SSR-safe', async () => {
    const getStorage = vi.fn(() => storage())
    const memory = createWebStorageMemory({ key: 'chat', getStorage })
    const controller = new AbortController()
    controller.abort(new Error('cancelled'))
    await expect(memory.load({ signal: controller.signal })).rejects.toThrow('cancelled')
    await expect(memory.save([], { signal: controller.signal })).rejects.toThrow('cancelled')
    await expect(memory.clear?.({ signal: controller.signal })).rejects.toThrow('cancelled')
    expect(getStorage).not.toHaveBeenCalled()
    await expect(createWebStorageMemory({ key: 'chat', getStorage: () => undefined }).load()).resolves.toEqual([])
  })
})
