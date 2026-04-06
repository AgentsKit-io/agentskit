import type {
  EmbedFn,
  RetrievedDocument,
  Retriever,
  RetrieverRequest,
  VectorMemory,
} from '@agentskit/core'

export interface InputDocument {
  id?: string
  content: string
  source?: string
  metadata?: Record<string, unknown>
}

export interface RAGConfig {
  embed: EmbedFn
  store: VectorMemory
  chunkSize?: number
  chunkOverlap?: number
  split?: (text: string) => string[]
  topK?: number
  threshold?: number
}

export interface RAG extends Retriever {
  ingest: (documents: InputDocument[]) => Promise<void>
  retrieve: (request: RetrieverRequest) => Promise<RetrievedDocument[]>
  search: (query: string, options?: { topK?: number; threshold?: number }) => Promise<RetrievedDocument[]>
}
