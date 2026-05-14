import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Message } from '@agentskit/core'

afterEach(() => {
  vi.resetModules()
})

function makeFakeClient() {
  const db = new Map<string, string>()

  return {
    execute: vi.fn(async ({ sql, args }: { sql: string; args?: unknown[] }) => {
      const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase()

      if (normalized.startsWith('CREATE TABLE')) {
        return { rows: [] }
      }

      if (normalized.startsWith('SELECT')) {
        const id = args?.[0] as string | undefined
        const val = id ? db.get(id) : undefined
        return { rows: val ? [{ messages: val }] : [] }
      }

      if (normalized.startsWith('INSERT INTO')) {
        const id = args?.[0] as string
        const json = args?.[1] as string
        db.set(id, json)
        return { rows: [] }
      }

      if (normalized.startsWith('DELETE')) {
        const id = args?.[0] as string
        db.delete(id)
        return { rows: [] }
      }

      return { rows: [] }
    }),
  }
}

describe('tursoChatMemory (injected fake client)', () => {
  it('load returns empty array when no messages stored', async () => {
    const fakeClient = makeFakeClient()
    const fakeLibsql = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@libsql/client', () => fakeLibsql)

    const { tursoChatMemory } = await import('../src/turso')
    const mem = tursoChatMemory({ url: 'file::memory:' })
    const result = await mem.load()
    expect(result).toEqual([])
  })

  it('save then load round-trips messages', async () => {
    const fakeClient = makeFakeClient()
    const fakeLibsql = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@libsql/client', () => fakeLibsql)

    const { tursoChatMemory } = await import('../src/turso')
    const mem = tursoChatMemory({ url: 'file::memory:', conversationId: 'conv-1' })

    const messages: Message[] = [
      { id: 'msg-1', role: 'user', content: 'hello turso', status: 'complete', createdAt: new Date('2026-01-01T00:00:00Z') },
    ]

    await mem.save(messages)
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.content).toBe('hello turso')
  })

  it('clear removes messages', async () => {
    const fakeClient = makeFakeClient()
    const fakeLibsql = { createClient: vi.fn(() => fakeLibsql) }
    vi.doMock('@libsql/client', () => fakeLibsql)

    const { tursoChatMemory } = await import('../src/turso')
    // Use a fresh instance after clearing module cache
    const mem = tursoChatMemory({ url: 'file::memory:', conversationId: 'conv-clear' })

    // Manually prime the fake db by calling execute
    const msg: Message = { id: 'x', role: 'user', content: 'bye', status: 'complete', createdAt: new Date(0) }

    // Use the fake client from the factory
    const client = makeFakeClient()
    const lib = { createClient: vi.fn(() => client) }
    vi.doMock('@libsql/client', () => lib)

    const { tursoChatMemory: tursoChatMemory2 } = await import('../src/turso')
    const mem2 = tursoChatMemory2({ url: 'file::memory:', conversationId: 'conv-clear2' })
    await mem2.save([msg])
    await mem2.clear?.()
    const result = await mem2.load()
    expect(result).toEqual([])
  })

  it('uses default conversationId when not provided', async () => {
    const fakeClient = makeFakeClient()
    const fakeLibsql = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@libsql/client', () => fakeLibsql)

    const { tursoChatMemory } = await import('../src/turso')
    const mem = tursoChatMemory({ url: 'file::memory:' })

    const msg: Message = { id: 'x', role: 'user', content: 'default conv', status: 'complete', createdAt: new Date(0) }
    await mem.save([msg])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.content).toBe('default conv')
  })

  it('authToken is passed to createClient', async () => {
    const fakeClient = makeFakeClient()
    const fakeLibsql = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@libsql/client', () => fakeLibsql)

    const { tursoChatMemory } = await import('../src/turso')
    const mem = tursoChatMemory({ url: 'libsql://x.turso.io', authToken: 'secret-token' })
    await mem.load()
    expect(fakeLibsql.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ authToken: 'secret-token' }),
    )
  })

  it('decodeMessages handles invalid JSON gracefully', async () => {
    const fakeClient = {
      execute: vi.fn(async ({ sql }: { sql: string }) => {
        const norm = sql.replace(/\s+/g, ' ').trim().toUpperCase()
        if (norm.startsWith('CREATE TABLE')) return { rows: [] }
        if (norm.startsWith('SELECT')) return { rows: [{ messages: 'INVALID_JSON!!!' }] }
        return { rows: [] }
      }),
    }
    const fakeLibsql = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@libsql/client', () => fakeLibsql)

    const { tursoChatMemory } = await import('../src/turso')
    const mem = tursoChatMemory({ url: 'file::memory:' })
    const result = await mem.load()
    expect(result).toEqual([])
  })
})
