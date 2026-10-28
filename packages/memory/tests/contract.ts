import { describe, it, expect } from 'vitest'
import type { ChatMemory, EmbedFn, Message, VectorDocument, VectorMemory } from '@agentskit/core'

/**
 * Contract test harness from ADR 0003 — runs CM1–CM6 against a ChatMemory,
 * VM1–VM8 against a VectorMemory and E1–E3 against an EmbedFn. Every backend
 * is registered explicitly: either with a case that runs the invariants, or
 * as `uncovered` with a reason (see `contract.test.ts`).
 */
export interface ChatMemoryContractCase {
  name: string
  /** Construct a fresh, empty memory under test. */
  build(): ChatMemory | Promise<ChatMemory>
  /** Release resources (temp files, handles). */
  cleanup?(): void | Promise<void>
  /** Invariants known to be violated: reported as `it.todo` with the reason. */
  todo?: Partial<Record<ChatInvariantId, string>>
}

export interface VectorMemoryContractCase {
  name: string
  build(): VectorMemory | Promise<VectorMemory>
  cleanup?(): void | Promise<void>
  /** Embedding dimensionality this backend is configured for (VM2). */
  dimensions?: number
  todo?: Partial<Record<VectorInvariantId, string>>
}

export interface EmbedFnContractCase {
  name: string
  build(): EmbedFn
  /** Returns an EmbedFn whose underlying provider fails. */
  buildFailing(): EmbedFn
  /** Number of observable side effects since build (E2). */
  sideEffects?(): number
}

/** A backend deliberately outside the suites, with the reason it is not covered. */
export interface UncoveredBackend {
  name: string
  reason: string
}

export const CHAT_INVARIANTS = ['CM1', 'CM2', 'CM3', 'CM4', 'CM5', 'CM6'] as const
export const VECTOR_INVARIANTS = ['VM1', 'VM2', 'VM3', 'VM4', 'VM5', 'VM6', 'VM7', 'VM8'] as const
export type ChatInvariantId = (typeof CHAT_INVARIANTS)[number]
export type VectorInvariantId = (typeof VECTOR_INVARIANTS)[number]

export const chatMessage = (id: string, content = id, extra: Partial<Message> = {}): Message => ({
  id,
  role: 'user',
  content,
  status: 'complete',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...extra,
})

/** Registers one invariant, or an `it.todo` carrying the recorded violation. */
function invariant(
  todo: Partial<Record<string, string>> | undefined,
  id: string,
  title: string,
  body: () => Promise<void>,
): void {
  const reason = todo?.[id]
  if (reason) it.todo(`${id}: ${title} — VIOLATED: ${reason}`)
  else it(`${id}: ${title}`, body)
}

export function runChatMemoryContract(c: ChatMemoryContractCase): void {
  describe(`ChatMemory contract (ADR 0003 CM1–CM6): ${c.name}`, () => {
    const fresh = async (): Promise<ChatMemory> => c.build()
    const t = c.todo

    invariant(t, 'CM1', 'load is a snapshot — later saves or caller mutation do not change a loaded array', async () => {
      const mem = await fresh()
      await mem.save([chatMessage('a')])
      const snapshot = await mem.load()
      snapshot.push(chatMessage('intruder'))
      expect(await mem.load()).toHaveLength(1)
      const before = await mem.load()
      await mem.save([chatMessage('a'), chatMessage('b')])
      expect(before.map(m => m.id)).toEqual(['a'])
      expect(await mem.load()).toHaveLength(2)
      expect(Array.isArray(await mem.load())).toBe(true)
    })

    invariant(t, 'CM2', 'save replaces the whole history, it does not append', async () => {
      const mem = await fresh()
      await mem.save([chatMessage('a'), chatMessage('b')])
      await mem.save([chatMessage('c')])
      expect((await mem.load()).map(m => m.id)).toEqual(['c'])
    })

    invariant(t, 'CM3', 'order preserved; no reorder, dedupe or mutation', async () => {
      const mem = await fresh()
      const input = [
        chatMessage('z', 'first', { role: 'assistant' }),
        chatMessage('a', 'second'),
        chatMessage('a', 'same id again'),
        chatMessage('m', 'last', { createdAt: new Date('2025-06-01T00:00:00.000Z') }),
      ]
      const frozen = JSON.stringify(input)
      await mem.save(input)
      expect(JSON.stringify(input)).toBe(frozen)
      const loaded = await mem.load()
      expect(loaded.map(m => [m.id, m.role, m.content])).toEqual(input.map(m => [m.id, m.role, m.content]))
      expect(loaded.map(m => new Date(m.createdAt).toISOString())).toEqual(input.map(m => m.createdAt.toISOString()))
    })

    invariant(t, 'CM4', 'save is atomic — concurrent saves leave exactly one complete history', async () => {
      const mem = await fresh()
      const one = Array.from({ length: 20 }, (_, i) => chatMessage(`one-${i}`))
      const two = Array.from({ length: 20 }, (_, i) => chatMessage(`two-${i}`))
      await Promise.all([mem.save(one), mem.save(two)])
      const ids = (await mem.load()).map(m => m.id)
      const isOne = ids.join() === one.map(m => m.id).join()
      const isTwo = ids.join() === two.map(m => m.id).join()
      expect(isOne || isTwo).toBe(true)
    })

    invariant(t, 'CM5', 'load on a fresh memory returns []', async () => {
      const mem = await fresh()
      expect(await mem.load()).toEqual([])
    })

    invariant(t, 'CM6', 'clear is optional; when present it empties, otherwise save([]) does', async () => {
      const mem = await fresh()
      await mem.save([chatMessage('a')])
      if (mem.clear) await mem.clear()
      else await mem.save([])
      expect(await mem.load()).toEqual([])
      await mem.save([chatMessage('b')])
      await mem.save([])
      expect(await mem.load()).toEqual([])
    })

    if (c.cleanup) {
      it('cleanup', async () => {
        await c.cleanup?.()
      })
    }
  })
}

const near = (embedding: number[], dims: number): number[] => {
  const v = new Array<number>(dims).fill(0)
  for (let i = 0; i < Math.min(dims, embedding.length); i++) v[i] = embedding[i]
  return v
}

export function runVectorMemoryContract(c: VectorMemoryContractCase): void {
  describe(`VectorMemory contract (ADR 0003 VM1–VM8): ${c.name}`, () => {
    const dims = c.dimensions ?? 3
    const t = c.todo
    const doc = (id: string, content: string, e: number[], metadata?: Record<string, unknown>): VectorDocument => ({
      id,
      content,
      embedding: near(e, dims),
      ...(metadata ? { metadata } : {}),
    })
    const query = near([1, 0, 0], dims)
    const corpus = (): VectorDocument[] => [
      doc('far', 'far doc', [0, 0, 1]),
      doc('exact', 'exact doc', [1, 0, 0]),
      doc('close', 'close doc', [0.9, 0.3, 0]),
      doc('mid', 'mid doc', [0.5, 0.5, 0.5]),
    ]

    invariant(t, 'VM1', 'store is upsert by id', async () => {
      const mem = await c.build()
      await mem.store([doc('a', 'old content', [1, 0, 0])])
      await mem.store([doc('a', 'new content', [1, 0, 0])])
      const hits = (await mem.search(query, { topK: 10 })).filter(h => h.id === 'a')
      expect(hits).toHaveLength(1)
      expect(hits[0].content).toBe('new content')
    })

    invariant(t, 'VM2', 'dimensionality is a construction concern; a configured backend stores and searches consistently', async () => {
      const mem = await c.build()
      await mem.store(corpus())
      const hits = await mem.search(query, { topK: 10 })
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].id).toBe('exact')
    })

    invariant(t, 'VM3', 'search returns scored documents sorted by score descending', async () => {
      const mem = await c.build()
      await mem.store(corpus())
      const hits = await mem.search(query, { topK: 10 })
      expect(hits.length).toBeGreaterThan(1)
      const scores = hits.map(h => h.score)
      for (const s of scores) expect(typeof s).toBe('number')
      expect(scores).toEqual([...scores].sort((a, b) => (b as number) - (a as number)))
    })

    invariant(t, 'VM4', 'topK is an upper bound and results are never padded', async () => {
      const mem = await c.build()
      await mem.store([doc('a', 'a', [1, 0, 0]), doc('b', 'b', [0.9, 0.3, 0])])
      expect((await mem.search(query, { topK: 1 })).length).toBeLessThanOrEqual(1)
      const wide = await mem.search(query, { topK: 50 })
      expect(wide.length).toBeLessThanOrEqual(2)
      expect(new Set(wide.map(h => h.id)).size).toBe(wide.length)
    })

    invariant(t, 'VM5', 'threshold is exclusive from below', async () => {
      const mem = await c.build()
      await mem.store(corpus())
      const all = await mem.search(query, { topK: 10 })
      const top = all[0].score as number
      const above = await mem.search(query, { topK: 10, threshold: top })
      for (const h of above) expect(h.score as number).toBeGreaterThan(top)
      expect(above.map(h => h.id)).not.toContain(all[0].id)
      expect(await mem.search(query, { topK: 10, threshold: top + 1 })).toEqual([])
    })

    invariant(t, 'VM6', 'metadata is opaque and round-trips what the caller stored', async () => {
      const mem = await c.build()
      await mem.store([doc('m', 'with metadata', [1, 0, 0], { source: 'x', nested: { n: 1, list: [1, 'two'] } })])
      const [hit] = await mem.search(query, { topK: 1 })
      expect(hit.metadata).toMatchObject({ source: 'x', nested: { n: 1, list: [1, 'two'] } })
    })

    invariant(t, 'VM7', 'delete is optional; when present removed ids no longer match', async () => {
      const mem = await c.build()
      await mem.store(corpus())
      if (!mem.delete) return
      await mem.delete(['exact'])
      const ids = (await mem.search(query, { topK: 10 })).map(h => h.id)
      expect(ids).not.toContain('exact')
      expect(ids.length).toBeGreaterThan(0)
    })

    invariant(t, 'VM8', 'documents and results are JSON-serializable', async () => {
      const mem = await c.build()
      const docs = corpus().map(d => ({ ...d, metadata: { tag: d.id } }))
      expect(JSON.parse(JSON.stringify(docs))).toEqual(docs)
      await mem.store(docs)
      const hits = await mem.search(query, { topK: 10 })
      expect(JSON.parse(JSON.stringify(hits))).toEqual(hits)
    })

    if (c.cleanup) {
      it('cleanup', async () => {
        await c.cleanup?.()
      })
    }
  })
}

export function runEmbedFnContract(c: EmbedFnContractCase): void {
  describe(`EmbedFn contract (ADR 0003 E1–E3): ${c.name}`, () => {
    it('E1: same input yields the same vector across calls', async () => {
      const embed = c.build()
      const a = await embed('hello world')
      const b = await embed('hello world')
      expect(a).toEqual(b)
      expect(Array.isArray(a)).toBe(true)
      expect(a.every(n => typeof n === 'number')).toBe(true)
    })

    it('E2: no side effects', async () => {
      const embed = c.build()
      const before = c.sideEffects?.() ?? 0
      await embed('hello')
      await embed('hello')
      expect(c.sideEffects?.() ?? 0).toBe(before)
    })

    it('E3: failure is a rejection, never a null embedding', async () => {
      await expect(c.buildFailing()('boom')).rejects.toBeDefined()
    })
  })
}

/** Lists a backend that is intentionally not run through the suites. */
export function listUncovered(title: string, backends: readonly UncoveredBackend[]): void {
  describe(`${title}: not covered`, () => {
    for (const b of backends) it.todo(`${b.name} — ${b.reason}`)
  })
}
