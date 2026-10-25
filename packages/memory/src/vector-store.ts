/** Vector and metadata fields stored by a backend-neutral vector store. */
export interface VectorStoreDocument {
  id: string
  vector: number[]
  metadata: Record<string, unknown>
}

/** Search result returned by a backend-neutral vector store. */
export interface VectorStoreResult {
  id: string
  score: number
  metadata: Record<string, unknown>
}

/** Backend-neutral upsert, query, and delete contract for vector data. */
export interface VectorStore {
  upsert(docs: VectorStoreDocument[]): Promise<void>
  query(vector: number[], topK: number): Promise<VectorStoreResult[]>
  delete(ids: string[]): Promise<void>
}
