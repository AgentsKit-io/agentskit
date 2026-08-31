import { generateId } from '@agentskit/core'
import type { RetrievedDocument, RetrieverRequest, VectorDocument } from '@agentskit/core'
import type { InputDocument, RAG, RAGConfig } from './types'
import { chunkText } from './chunker'

function resolvePositiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.floor(value))
}

function resolveThreshold(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return value
}

function resolveChunkSize(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback
  return Math.floor(value)
}

function resolveChunkOverlap(value: number | undefined, fallback: number, chunkSize: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) return fallback
  return Math.min(Math.floor(value), Math.max(0, chunkSize - 1))
}

/**
 * R6: scoreless results keep input order. If any score is present, every
 * result must have a finite numeric score and the list is sorted descending.
 * Mixed / non-finite scores are a contract failure (never fabricate -Infinity).
 */
function enforceScoreOrder(docs: RetrievedDocument[]): RetrievedDocument[] {
  if (docs.length === 0) return docs
  const anyScore = docs.some(d => d.score !== undefined)
  if (!anyScore) return docs

  for (const d of docs) {
    if (typeof d.score !== 'number' || !Number.isFinite(d.score)) {
      throw new TypeError(
        'createRAG search: every result must have a finite numeric score when scores are present',
      )
    }
  }

  return [...docs].sort((a, b) => (b.score as number) - (a.score as number))
}

export function createRAG(config: RAGConfig): RAG {
  const {
    embed,
    store,
    split,
  } = config

  const chunkSize = resolveChunkSize(config.chunkSize, 512)
  const chunkOverlap = resolveChunkOverlap(config.chunkOverlap, 50, chunkSize)
  const defaultTopK = resolvePositiveInt(config.topK, 5)
  const defaultThreshold = resolveThreshold(config.threshold, 0)
  const knownChunkIds = new Map<string, string[]>()

  async function ingest(documents: InputDocument[]): Promise<void> {
    const vectorDocs: VectorDocument[] = []
    const replacements = new Map<string, { previous: string[]; current: string[] }>()

    for (const doc of documents) {
      // Snapshot at ingest boundary so later mutation of the caller's object
      // cannot affect already-embedded chunks.
      const content = doc.content
      const docId = doc.id ?? generateId('doc')
      if (!content) {
        replacements.set(docId, { previous: knownChunkIds.get(docId) ?? [], current: [] })
        continue
      }
      const source = doc.source
      const metadata = doc.metadata ? { ...doc.metadata } : undefined
      const chunks = chunkText(content, { chunkSize, chunkOverlap, split })
      const currentIds = chunks.map((_, i) => `${docId}_chunk_${i}`)
      replacements.set(docId, { previous: knownChunkIds.get(docId) ?? [], current: currentIds })

      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${docId}_chunk_${i}`
        const embedding = await embed(chunks[i]!)

        vectorDocs.push({
          id: chunkId,
          content: chunks[i]!,
          embedding,
          metadata: {
            ...metadata,
            source,
            documentId: docId,
            chunkIndex: i,
          },
        })
      }
    }

    if (vectorDocs.length > 0) {
      await store.store(vectorDocs)
    }
    if (store.delete) {
      const stale = [...replacements.values()].flatMap(({ previous, current }) => previous.filter(id => !current.includes(id)))
      if (stale.length > 0) await store.delete(stale)
    }
    for (const [docId, replacement] of replacements) knownChunkIds.set(docId, replacement.current)
  }

  async function search(
    query: string,
    options?: { topK?: number; threshold?: number },
  ): Promise<RetrievedDocument[]> {
    const topK = options?.topK !== undefined
      ? resolvePositiveInt(options.topK, defaultTopK)
      : defaultTopK
    const threshold = options?.threshold !== undefined
      ? resolveThreshold(options.threshold, defaultThreshold)
      : defaultThreshold

    const queryEmbedding = await embed(query)
    const results = await store.search(queryEmbedding, { topK, threshold })
    return enforceScoreOrder(results)
  }

  async function retrieve(request: RetrieverRequest): Promise<RetrievedDocument[]> {
    return search(request.query)
  }

  return { ingest, retrieve, search }
}
