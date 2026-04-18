import { describe, expect, it } from 'vitest'
import { createInMemoryMemory } from '../src/memory'
import { createVirtualizedMemory } from '../src/virtualized-memory'
import type { Message } from '../src/types/message'

function msg(id: string, offsetMs: number, role: Message['role'] = 'user', content = id): Message {
  return { id, role, content, status: 'complete', createdAt: new Date(offsetMs) }
}

function history(n: number): Message[] {
  return Array.from({ length: n }, (_, i) => msg(`m${i}`, i * 1000))
}

describe('createVirtualizedMemory', () => {
  it('returns the full history when it fits in the hot window', async () => {
    const backing = createInMemoryMemory(history(5))
    const vm = createVirtualizedMemory(backing, { maxActive: 10 })
    const loaded = await vm.load()
    expect(loaded.map(m => m.id)).toEqual(history(5).map(m => m.id))
  })

  it('trims to the hot window when over maxActive', async () => {
    const backing = createInMemoryMemory(history(20))
    const vm = createVirtualizedMemory(backing, { maxActive: 5 })
    const loaded = await vm.load()
    expect(loaded).toHaveLength(5)
    expect(loaded[0]!.id).toBe('m15')
    expect(loaded[4]!.id).toBe('m19')
  })

  it('size reports full backing length', async () => {
    const backing = createInMemoryMemory(history(20))
    const vm = createVirtualizedMemory(backing, { maxActive: 5 })
    expect(await vm.size()).toBe(20)
  })

  it('loadAll bypasses virtualization', async () => {
    const backing = createInMemoryMemory(history(10))
    const vm = createVirtualizedMemory(backing, { maxActive: 3 })
    const all = await vm.loadAll()
    expect(all).toHaveLength(10)
  })

  it('retriever interleaves cold messages in chronological order', async () => {
    const backing = createInMemoryMemory(history(20))
    const vm = createVirtualizedMemory(backing, {
      maxActive: 5,
      retriever: ({ cold, maxRetrieved }) => cold.slice(0, maxRetrieved).slice(0, 2),
      maxRetrieved: 2,
    })
    const loaded = await vm.load()
    expect(loaded).toHaveLength(7)
    expect(loaded.map(m => m.id)).toEqual(['m0', 'm1', 'm15', 'm16', 'm17', 'm18', 'm19'])
  })

  it('retriever skips ids already in the hot window', async () => {
    const backing = createInMemoryMemory(history(20))
    const vm = createVirtualizedMemory(backing, {
      maxActive: 5,
      retriever: ({ hot }) => hot.slice(0, 1),
      maxRetrieved: 5,
    })
    const loaded = await vm.load()
    expect(loaded).toHaveLength(5)
  })

  it('save merges caller messages with cold tail preserved', async () => {
    const backing = createInMemoryMemory(history(20))
    const vm = createVirtualizedMemory(backing, { maxActive: 5 })
    const hot = await vm.load()
    const mutated = [...hot, msg('m20', 20_000, 'assistant', 'new')]
    await vm.save(mutated)

    const all = await vm.loadAll()
    expect(all).toHaveLength(21)
    expect(all[all.length - 1]!.id).toBe('m20')
    expect(all[0]!.id).toBe('m0')
  })

  it('save replaces edited hot messages without duplicating', async () => {
    const backing = createInMemoryMemory(history(3))
    const vm = createVirtualizedMemory(backing, { maxActive: 10 })
    const hot = await vm.load()
    hot[1]!.content = 'edited'
    await vm.save(hot)
    const all = await vm.loadAll()
    expect(all).toHaveLength(3)
    expect(all[1]!.content).toBe('edited')
  })

  it('clear delegates to backing', async () => {
    const backing = createInMemoryMemory(history(3))
    const vm = createVirtualizedMemory(backing, { maxActive: 5 })
    await vm.clear?.()
    expect(await backing.load()).toHaveLength(0)
  })

  it('clear no-ops when backing has no clear', async () => {
    const backing: { load: () => Promise<Message[]>; save: (m: Message[]) => Promise<void> } = {
      load: async () => history(2),
      save: async () => {},
    }
    const vm = createVirtualizedMemory(backing, { maxActive: 5 })
    await expect(vm.clear?.()).resolves.toBeUndefined()
  })
})
