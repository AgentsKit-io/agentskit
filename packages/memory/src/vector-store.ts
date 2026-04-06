export interface VectorStoreDocument {
  id: string
  vector: number[]
  metadata: Record<string, unknown>
}

export interface VectorStoreResult {
  id: string
  score: number
  metadata: Record<string, unknown>
}

export interface VectorStore {
  upsert(docs: VectorStoreDocument[]): Promise<void>
  query(vector: number[], topK: number): Promise<VectorStoreResult[]>
  delete(ids: string[]): Promise<void>
}
