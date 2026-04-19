import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

/**
 * pgvector-backed VectorMemory. We accept a minimal async SQL runner
 * so the caller picks the driver (`pg`, `postgres`, `@neondatabase/serverless`,
 * `@supabase/postgres-js`, ...). Expects a table with columns
 * `id text primary key`, `content text`, `embedding vector(N)`,
 * `metadata jsonb`.
 */

export interface PgVectorRunner {
  query: <T = Record<string, unknown>>(
    sql: string,
    params: unknown[],
  ) => Promise<{ rows: T[] }>
}

export interface PgVectorConfig {
  runner: PgVectorRunner
  /** Table name. Default 'agentskit_vectors'. */
  table?: string
  /** Default topK for search. Default 10. */
  topK?: number
}

function formatVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

export function pgvector(config: PgVectorConfig): VectorMemory {
  const table = config.table ?? 'agentskit_vectors'
  const defaultTopK = Math.max(1, config.topK ?? 10)

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      const values: unknown[] = []
      const placeholders = docs
        .map((doc, i) => {
          const base = i * 4
          values.push(doc.id, doc.content, formatVector(doc.embedding), JSON.stringify(doc.metadata ?? {}))
          return `($${base + 1}, $${base + 2}, $${base + 3}::vector, $${base + 4}::jsonb)`
        })
        .join(', ')
      await config.runner.query(
        `INSERT INTO ${table} (id, content, embedding, metadata) VALUES ${placeholders}
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata`,
        values,
      )
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const { rows } = await config.runner.query<{
        id: string
        content: string
        metadata: Record<string, unknown> | null
        distance: number
      }>(
        `SELECT id, content, metadata, (embedding <=> $1::vector) AS distance
         FROM ${table}
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [formatVector(embedding), topK],
      )
      return rows
        .map(r => ({
          id: r.id,
          content: r.content,
          metadata: r.metadata ?? undefined,
          score: 1 - r.distance,
        }))
        .filter(r => (r.score ?? 0) >= threshold)
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
      await config.runner.query(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids)
    },
  }
}
