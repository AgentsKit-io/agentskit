import { describe, it } from 'vitest'
import type { RetrievedDocument, Retriever, VectorDocument, VectorMemory } from '@agentskit/core'
import { createRAG } from '../src/rag'
import { createPartitionedRAG } from '../src/partitioned'
import { createHybridRetriever, createRerankedRetriever } from '../src/rerank'
import { runRetrieverContract, vocabEmbed, type RetrieverFixture } from './contract'

const cosine = (a: number[], b: number[]): number => {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i]! * b[i]!; na += a[i]! ** 2; nb += b[i]! ** 2 }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

/** Upsert-by-id cosine store honouring ADR 0003 VM1/VM3/VM4/VM5 and `$eq` filters. */
function cosineStore(): VectorMemory & { snapshot: () => unknown } {
  const docs = new Map<string, VectorDocument>()
  return {
    snapshot: () => [...docs.values()],
    async store(batch) { for (const d of batch) docs.set(d.id, structuredClone(d)) },
    async search(embedding, options) {
      const topK = options?.topK ?? 5
      const threshold = options?.threshold ?? 0
      const filter = options?.filter as Record<string, { $eq: unknown }> | undefined
      return [...docs.values()]
        .filter(d => !filter || Object.entries(filter).every(([k, v]) => d.metadata?.[k] === v.$eq))
        .map((d): RetrievedDocument => ({ id: d.id, content: d.content, score: cosine(embedding, d.embedding), metadata: structuredClone(d.metadata) }))
        .filter(r => (r.score as number) > threshold)
        .sort((a, b) => (b.score as number) - (a.score as number))
        .slice(0, topK)
    },
    async delete(ids) { for (const id of ids) docs.delete(id) },
  }
}

const failingStore: VectorMemory = {
  store: async () => { throw new Error('store down') },
  search: async () => { throw new Error('store down') },
}
const failingEmbed = async (): Promise<number[]> => { throw new Error('embedder down') }

const ragFixture = (): RetrieverFixture => {
  const store = cosineStore()
  const rag = createRAG({ embed: vocabEmbed, store })
  return { retriever: rag, ingest: docs => rag.ingest([...docs]), snapshot: store.snapshot }
}

const wrapFixture = (wrap: (base: Retriever) => Retriever) => (): RetrieverFixture => {
  const fx = ragFixture()
  return { ...fx, retriever: wrap(fx.retriever) }
}

const failingRag: Retriever = createRAG({ embed: failingEmbed, store: failingStore })

runRetrieverContract({
  name: 'createRAG',
  build: ragFixture,
  buildFailing: () => failingRag,
  defaultLimit: 5,
})

runRetrieverContract({
  name: 'createPartitionedRAG',
  build: () => {
    const store = cosineStore()
    const rag = createPartitionedRAG({ embed: vocabEmbed, store, partition: 'tenant-a', onDiagnostics: () => {} })
    return { retriever: rag, ingest: docs => rag.ingest([...docs]), snapshot: store.snapshot }
  },
  buildFailing: () => createPartitionedRAG({ embed: failingEmbed, store: failingStore, partition: 'tenant-a', onDiagnostics: () => {} }),
  defaultLimit: 5,
})

runRetrieverContract({
  name: 'createRerankedRetriever(createRAG, bm25Rerank)',
  build: wrapFixture(base => createRerankedRetriever(base)),
  buildFailing: () => createRerankedRetriever(failingRag),
  defaultLimit: 5,
  composite: base => createRerankedRetriever(base),
})

runRetrieverContract({
  name: 'createHybridRetriever(createRAG)',
  build: wrapFixture(base => createHybridRetriever(base)),
  buildFailing: () => createHybridRetriever(failingRag),
  defaultLimit: 5,
  composite: base => createHybridRetriever(base),
})

describe('Retriever contract (ADR 0004 R1–R11): not covered', () => {
  it.todo('voyageReranker / jinaReranker — RerankFn over hosted HTTP APIs, not Retrievers; their composition is covered by createRerankedRetriever above and requests are covered in rerank.test.ts')
  it.todo('document loaders (loaders*.ts) — produce InputDocument for ingest(), not Retrievers')
})
