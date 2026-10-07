import type { VectorFilter, VectorMemory } from '@agentskit/core'
import { createRAG } from './rag'
import type { RAG, RAGConfig } from './types'

/** Search evidence; bounded candidate retrieval can reduce recall even with store filters. */
export interface PartitionSearchDiagnostics {
  partition: string
  requestedTopK: number
  candidateLimit: number
  examined: number
  rejected: number
  returned: number
  recall: 'potentially-reduced'
}

/** Construction-bound partition and mandatory reporting of bounded retrieval. */
export interface PartitionedRAGConfig extends RAGConfig {
  partition: string
  /** Integer from 1 to 16, default 4. Applies even if the store ignores filters. */
  overfetchFactor?: number
  onDiagnostics: (diagnostics: PartitionSearchDiagnostics) => void
}

/** Compose createRAG with metadata isolation; stores must faithfully preserve metadata. */
export function createPartitionedRAG(config: PartitionedRAGConfig): RAG {
  const { partition, store, onDiagnostics, overfetchFactor = 4 } = config
  if (typeof partition !== 'string' || partition.length === 0) {
    throw new TypeError('createPartitionedRAG requires a non-empty partition')
  }
  if (!Number.isInteger(overfetchFactor) || overfetchFactor < 1 || overfetchFactor > 16) {
    throw new TypeError('overfetchFactor must be an integer from 1 to 16')
  }
  if (typeof onDiagnostics !== 'function') {
    throw new TypeError('createPartitionedRAG requires onDiagnostics')
  }
  const namespace = (id: string): string => JSON.stringify(['agentskit.rag.partition', partition, id])
  const filter: VectorFilter = { _akPartition: { $eq: partition } }
  const boundStore: VectorMemory = {
    region: store.region,
    store: docs => store.store(docs.map(doc => ({
      ...doc,
      id: namespace(doc.id),
      metadata: { ...doc.metadata, _akPartition: partition },
    }))),
    async search(embedding, options) {
      const topK = options?.topK ?? 5
      const candidateLimit = topK * overfetchFactor
      if (!Number.isSafeInteger(candidateLimit) || candidateLimit < 1) {
        throw new TypeError('partition candidate limit must be a positive safe integer')
      }
      const candidates = (await store.search(embedding, {
        ...options, topK: candidateLimit, filter,
      })).slice(0, candidateLimit)
      const matches = candidates.filter(doc => doc.metadata?._akPartition === partition)
      const results = matches.slice(0, topK)
      onDiagnostics({
        partition, requestedTopK: topK, candidateLimit, examined: candidates.length,
        rejected: candidates.length - matches.length, returned: results.length,
        recall: 'potentially-reduced',
      })
      return results
    },
  }
  if (store.delete) boundStore.delete = ids => store.delete!(ids.map(namespace))
  return createRAG({ ...config, store: boundStore })
}
