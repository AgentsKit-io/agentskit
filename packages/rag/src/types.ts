import type {
  EmbedFn,
  RetrievedDocument,
  Retriever,
  RetrieverRequest,
  VectorMemory,
} from '@agentskit/core'

/** A source document supplied to or returned from a RAG pipeline. */
export interface InputDocument {
  id?: string
  content: string
  source?: string
  metadata?: Record<string, unknown>
}

/** Configuration for a store-backed retrieval-augmented generation pipeline. */
export interface RAGConfig {
  embed: EmbedFn
  store: VectorMemory
  chunkSize?: number
  chunkOverlap?: number
  split?: (text: string) => string[]
  topK?: number
  threshold?: number
}

/** A retriever that can ingest documents into its configured vector store. */
export interface RAG extends Retriever {
  ingest: (documents: InputDocument[]) => Promise<void>
  retrieve: (request: RetrieverRequest) => Promise<RetrievedDocument[]>
  search: (query: string, options?: { topK?: number; threshold?: number }) => Promise<RetrievedDocument[]>
}
