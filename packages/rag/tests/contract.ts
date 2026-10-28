import { describe, it, expect } from 'vitest'
import type { Message, RetrievedDocument, Retriever, RetrieverRequest } from '@agentskit/core'

/**
 * Contract test harness from ADR 0004 — runs invariants R1–R11 against any
 * `Retriever`. Retrievers that are indexable expose `ingest`; the harness
 * seeds a shared corpus through it so every implementation is exercised on
 * the same data.
 */
export interface RetrieverFixture {
  retriever: Retriever
  /** Index the harness corpus. */
  ingest(docs: ReadonlyArray<{ id: string; content: string; source?: string; metadata?: Record<string, unknown> }>): Promise<void>
  /** Serializable view of the index, used to prove retrieve is read-only (R1). */
  snapshot(): unknown
}

export type RetrieverInvariantId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10' | 'R11'

export interface RetrieverContractCase {
  name: string
  build(): RetrieverFixture
  /** A retriever of the same kind whose backend always rejects (R4). */
  buildFailing(): Retriever
  /** Documented default result limit (R10). */
  defaultLimit: number
  /** Composite retrievers: wrap an arbitrary base to check R11. */
  composite?: (base: Retriever) => Retriever
  /** Invariants known to be violated: reported as `it.todo` with the reason. */
  todo?: Partial<Record<RetrieverInvariantId, string>>
}

/** Words the reference embedder knows; any other word embeds to the zero vector. */
export const CONTRACT_VOCAB = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'filler'] as const

/** Bag-of-words embedder over `CONTRACT_VOCAB`: deterministic, so cosine scores are meaningful. */
export const vocabEmbed = async (text: string): Promise<number[]> => {
  const words = text.toLowerCase().split(/\W+/)
  return CONTRACT_VOCAB.map(w => words.filter(x => x === w).length)
}

export const CORPUS = [
  { id: 'd1', content: 'alpha beta', source: 'https://example.test/d1', metadata: { topic: 'greek' } },
  { id: 'd2', content: 'alpha gamma delta', source: 'https://example.test/d2' },
  { id: 'd3', content: 'gamma delta epsilon', source: 'https://example.test/d3' },
  { id: 'd4', content: 'alpha', source: 'https://example.test/d4' },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `f${i}`,
    content: `alpha filler ${'filler '.repeat(i)}`.trim(),
    source: `https://example.test/f${i}`,
  })),
]

const MATCH_QUERY = 'alpha'
const NO_MATCH_QUERY = 'quux unknown tokens'

const message = (content: string): Message => ({
  id: content, role: 'user', content, status: 'complete', createdAt: new Date(0),
})

const request = (query: string, messages: Message[] = []): RetrieverRequest => ({ query, messages })

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v)
    Object.freeze(value)
  }
  return value
}

const ids = (docs: RetrievedDocument[]): string[] => docs.map(d => d.id)

export function runRetrieverContract(c: RetrieverContractCase): void {
  describe(`Retriever contract (ADR 0004 R1–R11): ${c.name}`, () => {
    const t = c.todo
    const check = (id: RetrieverInvariantId, title: string, body: () => Promise<void>): void => {
      const reason = t?.[id]
      if (reason) it.todo(`${id}: ${title} — VIOLATED: ${reason}`)
      else it(`${id}: ${title}`, body)
    }
    const seeded = async (): Promise<RetrieverFixture> => {
      const fx = c.build()
      await fx.ingest(CORPUS)
      return fx
    }

    check('R1', 'retrieve does not mutate the index, the request or global state', async () => {
      const fx = await seeded()
      const before = JSON.stringify(fx.snapshot())
      const req = deepFreeze(request(MATCH_QUERY, [message('earlier')]))
      await fx.retriever.retrieve(req)
      await fx.retriever.retrieve(req)
      expect(JSON.stringify(fx.snapshot())).toBe(before)
      expect(req.query).toBe(MATCH_QUERY)
      expect(req.messages).toHaveLength(1)
    })

    check('R2', 'query drives ranking; messages are context a query-only retriever ignores', async () => {
      const fx = await seeded()
      const bare = await fx.retriever.retrieve(request(MATCH_QUERY))
      const chatty = await fx.retriever.retrieve(request(MATCH_QUERY, [message('gamma delta epsilon'), message('zeta')]))
      expect(ids(chatty)).toEqual(ids(bare))
      expect(bare.length).toBeGreaterThan(0)
    })

    check('R3', 'no relevant documents is [] — success, not an error', async () => {
      const fx = await seeded()
      expect(await fx.retriever.retrieve(request(NO_MATCH_QUERY))).toEqual([])
      expect(await c.build().retriever.retrieve(request(MATCH_QUERY))).toEqual([])
    })

    check('R4', 'errors reject; no sentinel documents', async () => {
      await expect(Promise.resolve().then(() => c.buildFailing().retrieve(request(MATCH_QUERY)))).rejects.toBeDefined()
    })

    check('R5', 'ids are stable across calls', async () => {
      const fx = await seeded()
      const first = await fx.retriever.retrieve(request(MATCH_QUERY))
      const second = await fx.retriever.retrieve(request(MATCH_QUERY))
      expect(first.length).toBeGreaterThan(0)
      expect(ids(second)).toEqual(ids(first))
      for (const d of first) expect(typeof d.id).toBe('string')
    })

    check('R6', 'score is all-or-none and results are sorted descending when present', async () => {
      const fx = await seeded()
      const docs = await fx.retriever.retrieve(request(MATCH_QUERY))
      expect(docs.length).toBeGreaterThan(1)
      const scored = docs.filter(d => d.score !== undefined)
      if (scored.length === 0) return
      expect(scored).toHaveLength(docs.length)
      const scores = docs.map(d => d.score as number)
      expect(scores).toEqual([...scores].sort((a, b) => b - a))
    })

    check('R7', 'score scale is consistent across calls and queries', async () => {
      const fx = await seeded()
      const a = await fx.retriever.retrieve(request(MATCH_QUERY))
      const again = await fx.retriever.retrieve(request(MATCH_QUERY))
      expect(again.map(d => d.score)).toEqual(a.map(d => d.score))
      const other = await fx.retriever.retrieve(request('gamma delta'))
      for (const d of [...a, ...other]) if (d.score !== undefined) expect(Number.isFinite(d.score)).toBe(true)
      const top = [...a, ...other].map(d => d.score).filter((s): s is number => typeof s === 'number')
      // A single scale: every score stays inside one fixed range for these inputs.
      for (const s of top) expect(s).toBeGreaterThanOrEqual(0)
      for (const s of top) expect(s).toBeLessThanOrEqual(1 + 1e-9)
    })

    check('R8', 'source, when reported, is the ingested source', async () => {
      const fx = await seeded()
      const docs = await fx.retriever.retrieve(request(MATCH_QUERY))
      expect(docs.length).toBeGreaterThan(0)
      for (const d of docs) {
        if (d.source === undefined) continue
        expect(d.source).toMatch(/^https:\/\/example\.test\/(d|f)\d+$/)
      }
    })

    check('R9', 'metadata is JSON-serializable', async () => {
      const fx = await seeded()
      const docs = await fx.retriever.retrieve(request(MATCH_QUERY))
      expect(JSON.parse(JSON.stringify(docs))).toEqual(docs)
    })

    check('R10', 'a documented default limit applies; there is no per-call option', async () => {
      const fx = await seeded()
      const docs = await fx.retriever.retrieve(request(MATCH_QUERY))
      expect(docs.length).toBeLessThanOrEqual(c.defaultLimit)
      expect(docs.length).toBeGreaterThan(0)
      expect(fx.retriever.retrieve.length).toBeLessThanOrEqual(1)
    })

    if (c.composite) {
      const composite = c.composite
      check('R11', 'a composite renormalizes heterogeneous base scores and keeps R6 ordering', async () => {
        const raw: RetrievedDocument[] = [
          { id: 'low', content: 'alpha', score: 3 },
          { id: 'high', content: 'alpha beta gamma', score: 42 },
          { id: 'mid', content: 'alpha delta', score: 17 },
        ]
        const docs = await composite({ retrieve: async () => raw.map(d => ({ ...d })) }).retrieve(request(MATCH_QUERY))
        expect(docs.length).toBeGreaterThan(0)
        for (const d of docs) expect(typeof d.score).toBe('number')
        const scores = docs.map(d => d.score as number)
        expect(scores).toEqual([...scores].sort((a, b) => b - a))
        expect(await composite({ retrieve: async () => [] }).retrieve(request(MATCH_QUERY))).toEqual([])
      })
    } else {
      it.todo(`R11: ${c.name} is not a composite — not applicable`)
    }
  })
}
