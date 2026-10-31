import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

/**
 * MongoDB Atlas Vector Search adapter. Caller injects a typed collection
 * shape (drop-in for the official `mongodb` driver's `Collection` type) so
 * we don't bundle a driver. Atlas' \`$vectorSearch\` aggregation runs
 * server-side; we just translate \`store\` / \`search\` / \`delete\` to
 * insertMany + aggregate + deleteMany.
 */

export interface MongoCollectionLike {
  insertMany(docs: Array<Record<string, unknown>>, options?: unknown): Promise<unknown>
  updateOne?(filter: Record<string, unknown>, update: Record<string, unknown>, options?: unknown): Promise<unknown>
  bulkWrite?(operations: Array<Record<string, unknown>>, options?: unknown): Promise<unknown>
  deleteMany(filter: Record<string, unknown>): Promise<unknown>
  aggregate<T = Record<string, unknown>>(pipeline: Array<Record<string, unknown>>): {
    toArray(): Promise<T[]>
  }
}

/** Collection adapter and search settings for MongoDB Atlas vector memory. */
export interface MongoAtlasVectorConfig {
  collection: MongoCollectionLike
  /** Atlas Search index name on the embedding field. */
  indexName: string
  /** Field that holds the embedding vector. Default `embedding`. */
  vectorField?: string
  /** numCandidates for $vectorSearch. Default `topK * 10`. */
  numCandidates?: number
  topK?: number
}

/** Creates a vector memory backed by a MongoDB Atlas collection.
 * @param config Collection adapter, vector field, and search settings.
 * @returns A vector memory backed by the configured collection.
 */
export function mongoAtlasVectorStore(config: MongoAtlasVectorConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)
  const vectorField = config.vectorField ?? 'embedding'
  const fields = (doc: VectorDocument) => ({
    content: doc.content,
    [vectorField]: doc.embedding,
    metadata: doc.metadata ?? {},
  })

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      if (config.collection.bulkWrite) {
        await config.collection.bulkWrite(docs.map(d => ({
          updateOne: {
            filter: { _id: d.id },
            update: {
              $set: fields(d),
            },
            upsert: true,
          },
        })), { ordered: true })
      } else {
        if (config.collection.updateOne) {
          for (const d of docs) {
            await config.collection.updateOne({ _id: d.id }, { $set: fields(d) }, { upsert: true })
          }
        } else {
          // Compatibility for older injected collection shims without updateOne.
          await config.collection.insertMany(docs.map(d => ({
            _id: d.id,
            ...fields(d),
          })))
        }
      }
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const numCandidates = config.numCandidates ?? topK * 10
      const cursor = config.collection.aggregate<{
        _id: string; content: string; metadata?: Record<string, unknown>; score: number
      }>([
        {
          $vectorSearch: {
            index: config.indexName,
            path: vectorField,
            queryVector: embedding,
            numCandidates,
            limit: topK,
          },
        },
        { $project: { content: 1, metadata: 1, score: { $meta: 'vectorSearchScore' } } },
      ])
      const rows = await cursor.toArray()
      return rows
        .map(row => ({
          id: String(row._id),
          content: String(row.content ?? ''),
          score: row.score,
          metadata: row.metadata,
        }))
        .filter(r => (r.score ?? 0) > threshold)
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      await config.collection.deleteMany({ _id: { $in: ids } })
    },
  }
}
