import { ErrorCodes, MemoryError } from '@agentskit/core'
import type { VectorMemory, VectorDocument, RetrievedDocument } from '@agentskit/core'
import type { VectorStore } from './vector-store'
import { matchesFilter } from './vector/filter'

export interface FileVectorMemoryConfig {
  path: string
  store?: VectorStore
}

function requireVectra(): { LocalIndex: new (path: string) => VectraIndex } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('vectra')
  } catch {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_PEER_MISSING,
      message: 'Install vectra to use fileVectorMemory: npm install vectra',
      hint: 'fileVectorMemory uses the optional peer "vectra" for the on-disk index.',
    })
  }
}

interface VectraIndex {
  isIndexCreated(): Promise<boolean>
  createIndex(): Promise<void>
  insertItem(item: { vector: number[]; metadata: Record<string, unknown> }): Promise<unknown>
  queryItems(vector: number[], topK: number): Promise<Array<{ score: number; item: { metadata: Record<string, unknown> } }>>
  listItems(): Promise<Array<{ id: string; metadata: Record<string, unknown> }>>;
  deleteItem(id: string): Promise<void>
}

function createVectraStore(dirPath: string): VectorStore {
  let index: VectraIndex | null = null

  const getIndex = async (): Promise<VectraIndex> => {
    if (index) return index
    const { LocalIndex } = requireVectra()
    index = new LocalIndex(dirPath)
    if (!(await index.isIndexCreated())) {
      await index.createIndex()
    }
    return index
  }

  return {
    async upsert(docs) {
      const idx = await getIndex()
      for (const doc of docs) {
        await idx.insertItem({
          vector: doc.vector,
          metadata: { _id: doc.id, ...doc.metadata },
        })
      }
    },
    async query(vector, topK) {
      const idx = await getIndex()
      const results = await idx.queryItems(vector, topK)
      return results.map(r => ({
        id: String(r.item.metadata._id ?? ''),
        score: r.score,
        metadata: r.item.metadata,
      }))
    },
    async delete(ids) {
      const idx = await getIndex()
      const items = await idx.listItems()
      for (const item of items) {
        if (ids.includes(String(item.metadata._id ?? item.id))) {
          await idx.deleteItem(item.id)
        }
      }
    },
  }
}

export function fileVectorMemory(config: FileVectorMemoryConfig): VectorMemory {
  const store = config.store ?? createVectraStore(config.path)
  const contentCache = new Map<string, string>()

  return {
    async store(docs: VectorDocument[]) {
      for (const doc of docs) {
        contentCache.set(doc.id, doc.content)
      }
      await store.upsert(docs.map(doc => ({
        id: doc.id,
        vector: doc.embedding,
        metadata: { content: doc.content, ...doc.metadata },
      })))
    },
    async search(embedding, options) {
      const topK = options?.topK ?? 5
      const threshold = options?.threshold ?? 0
      // Over-fetch when a filter is set so we can still return ~topK after filtering.
      const fetchK = options?.filter ? Math.max(topK * 4, 50) : topK
      const results = await store.query(embedding, fetchK)

      return results
        .filter(r => r.score >= threshold)
        .filter(r => matchesFilter(r.metadata, options?.filter))
        .slice(0, topK)
        .map((r): RetrievedDocument => ({
          id: r.id,
          content: String(r.metadata.content ?? contentCache.get(r.id) ?? ''),
          score: r.score,
          metadata: r.metadata,
        }))
    },
    async delete(ids) {
      for (const id of ids) contentCache.delete(id)
      await store.delete(ids)
    },
  }
}
