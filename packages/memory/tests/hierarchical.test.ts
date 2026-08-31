import { describe, expect, it, vi } from 'vitest'
import type { ChatMemory, Message } from '@agentskit/core'
import { createHierarchicalMemory } from '../src/hierarchical'

function memory(initial: Message[] = []): ChatMemory {
  let msgs = [...initial]
  return {
    async load() {
      return [...msgs]
    },
    async save(next) {
      msgs = [...next]
    },
    async clear() {
      msgs = []
    },
  }
}

function msg(id: string, offsetMs: number, role: Message['role'] = 'user', content = id): Message {
  return { id, role, content, status: 'complete', createdAt: new Date(offsetMs) }
}

function history(n: number): Message[] {
  return Array.from({ length: n }, (_, i) => msg(`m${i}`, i * 1000))
}

describe('createHierarchicalMemory', () => {
  it('returns working tier as-is when nothing to recall', async () => {
    const hub = createHierarchicalMemory({
      working: memory(history(5)),
      archival: memory(history(5)),
      workingLimit: 10,
    })
    const loaded = await hub.load()
    expect(loaded.map(m => m.id)).toEqual(history(5).map(m => m.id))
  })

  it('save trims working to workingLimit', async () => {
    const workingStore = memory()
    const archivalStore = memory()
    const hub = createHierarchicalMemory({
      working: workingStore,
      archival: archivalStore,
      workingLimit: 3,
    })
    await hub.save(history(10))
    const working = await hub.working()
    const archival = await hub.archival()
    expect(working).toHaveLength(3)
    expect(working[0]!.id).toBe('m7')
    expect(archival).toHaveLength(10)
  })

  it('indexes overflow into recall', async () => {
    const index = vi.fn(async () => {})
    const hub = createHierarchicalMemory({
      working: memory(),
      archival: memory(),
      workingLimit: 2,
      recall: {
        index,
        query: async () => [],
      },
    })
    await hub.save(history(5))
    const indexedIds = index.mock.calls.map(c => c[0].id)
    expect(indexedIds).toEqual(expect.arrayContaining(['m0', 'm1', 'm2']))
  })

  it('recall query results are spliced chronologically into load', async () => {
    const older = msg('old-1', -500)
    const hub = createHierarchicalMemory({
      working: memory(history(3)),
      archival: memory([older, ...history(3)]),
      recall: {
        index: async () => {},
        query: async () => [older],
      },
    })
    const loaded = await hub.load()
    expect(loaded[0]!.id).toBe('old-1')
    expect(loaded.slice(1).map(m => m.id)).toEqual(['m0', 'm1', 'm2'])
  })

  it('recall deduplicates against the working window', async () => {
    const hub = createHierarchicalMemory({
      working: memory([msg('m0', 0)]),
      archival: memory([msg('m0', 0)]),
      recall: {
        index: async () => {},
        query: async ({ working }) => working, // returns an already-present msg
      },
    })
    const loaded = await hub.load()
    expect(loaded).toHaveLength(1)
  })

  it('recall.query errors are swallowed — working still returned', async () => {
    const hub = createHierarchicalMemory({
      working: memory(history(2)),
      archival: memory(history(2)),
      recall: {
        index: async () => {},
        query: async () => {
          throw new Error('vector db down')
        },
      },
    })
    const loaded = await hub.load()
    expect(loaded).toHaveLength(2)
  })

  it('clear empties working and archival', async () => {
    const workingStore = memory(history(2))
    const archivalStore = memory(history(2))
    const hub = createHierarchicalMemory({
      working: workingStore,
      archival: archivalStore,
      workingLimit: 10,
    })
    await hub.clear?.()
    expect(await workingStore.load()).toHaveLength(0)
    expect(await archivalStore.load()).toHaveLength(0)
  })

  it('save deduplicates against archival — does not double-index existing messages', async () => {
    const index = vi.fn(async () => {})
    const archivalStore = memory([msg('m0', 0), msg('m1', 1)])
    const hub = createHierarchicalMemory({
      working: memory(),
      archival: archivalStore,
      workingLimit: 2,
      recall: { index, query: async () => [] },
    })
    await hub.save([msg('m0', 0), msg('m1', 1)])
    expect(index).not.toHaveBeenCalled()
  })

  it('updates an existing archival message without dropping other history', async () => {
    const archivalStore = memory([msg('old', 0), msg('edited', 1, 'user', 'before')])
    const hub = createHierarchicalMemory({ working: memory(), archival: archivalStore, workingLimit: 1 })
    await hub.save([msg('edited', 1, 'user', 'after')])
    expect((await archivalStore.load()).map(m => [m.id, m.content])).toEqual([
      ['old', 'old'],
      ['edited', 'after'],
    ])
  })

  it('refuses to clear when recall cannot clear its index', async () => {
    const workingStore = memory(history(1))
    const archivalStore = memory(history(1))
    const hub = createHierarchicalMemory({
      working: workingStore,
      archival: archivalStore,
      recall: { index: async () => {}, query: async () => [] },
    })
    await expect(hub.clear?.()).rejects.toMatchObject({ code: 'AK_MEMORY_CLEAR_FAILED' })
    expect(await archivalStore.load()).toHaveLength(1)
  })

  it('without recall behaves as a working + archival pair', async () => {
    const workingStore = memory()
    const archivalStore = memory()
    const hub = createHierarchicalMemory({
      working: workingStore,
      archival: archivalStore,
      workingLimit: 2,
    })
    await hub.save(history(4))
    expect((await workingStore.load()).map(m => m.id)).toEqual(['m2', 'm3'])
    expect(await archivalStore.load()).toHaveLength(4)
  })
})
