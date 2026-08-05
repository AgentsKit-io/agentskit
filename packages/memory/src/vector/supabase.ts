import { ErrorCodes, MemoryError } from '@agentskit/core'
import type { RetrievedDocument, VectorMemory, VectorSearchOptions } from '@agentskit/core'

export interface SupabaseVectorStoreConfig {
  /** Supabase project URL, e.g. `https://xyz.supabase.co`. */
  url: string
  /** Service-role key (server-side only). */
  serviceRoleKey: string
  /** Table name. Default `agentskit_vectors`. */
  table?: string
  /** Purpose-specific similarity-search RPC. Default `match_agentskit_vectors`. */
  matchFunction?: string
  /** Default topK for search. Default 10. */
  topK?: number
}

interface SupabaseResult<T> {
  data: T | null
  error: { message: string } | null
}

interface SupabaseTableQuery {
  upsert(rows: unknown[], options?: { onConflict?: string }): PromiseLike<SupabaseResult<unknown>>
  delete(): {
    in(column: string, values: string[]): PromiseLike<SupabaseResult<unknown>>
  }
}

interface SupabaseClientLike {
  from(table: string): SupabaseTableQuery
  rpc<T>(fn: string, params?: Record<string, unknown>): PromiseLike<SupabaseResult<T>>
}

interface SupabaseModule {
  createClient(url: string, key: string): SupabaseClientLike
}

interface SupabaseMatchRow {
  id: string
  content: string
  metadata: Record<string, unknown> | null
  similarity: number
}

let cachedSdk: Promise<SupabaseModule> | null = null

async function loadSdk(): Promise<SupabaseModule> {
  if (!cachedSdk) {
    cachedSdk = (async () => {
      try {
        const moduleId = '@supabase/supabase-js'
        return (await import(/* @vite-ignore */ moduleId)) as unknown as SupabaseModule
      } catch {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_PEER_MISSING,
          message: 'Install @supabase/supabase-js to use supabaseVectorStore: npm install @supabase/supabase-js',
          hint: 'supabaseVectorStore uses the optional peer "@supabase/supabase-js".',
        })
      }
    })()
  }
  return cachedSdk
}

function throwOnError(result: SupabaseResult<unknown>, operation: string): void {
  if (!result.error) return
  throw new MemoryError({
    code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
    message: `supabase ${operation}: ${result.error.message}`,
    hint: 'Check the table, purpose-specific match RPC, and service-role key permissions.',
  })
}

/**
 * Supabase-hosted pgvector using direct PostgREST mutations and one
 * purpose-specific similarity-search RPC. The service-role key stays
 * server-side and `@supabase/supabase-js` is loaded lazily.
 */
export function supabaseVectorStore(config: SupabaseVectorStoreConfig): VectorMemory {
  const table = config.table ?? 'agentskit_vectors'
  const matchFunction = config.matchFunction ?? 'match_agentskit_vectors'
  const defaultTopK = Math.max(1, Math.floor(config.topK ?? 10))
  let clientPromise: Promise<SupabaseClientLike> | null = null

  const getClient = (): Promise<SupabaseClientLike> => {
    if (!clientPromise) {
      clientPromise = loadSdk().then(sdk => sdk.createClient(config.url, config.serviceRoleKey))
    }
    return clientPromise
  }

  return {
    async store(docs) {
      if (docs.length === 0) return
      const client = await getClient()
      const result = await client.from(table).upsert(
        docs.map(doc => ({
          id: doc.id,
          content: doc.content,
          embedding: doc.embedding,
          metadata: doc.metadata ?? {},
        })),
        { onConflict: 'id' },
      )
      throwOnError(result, 'store')
    },

    async search(embedding, options: VectorSearchOptions = {}): Promise<RetrievedDocument[]> {
      const client = await getClient()
      const topK = Math.max(1, Math.floor(options.topK ?? defaultTopK))
      const threshold = options.threshold ?? 0
      const result = await client.rpc<SupabaseMatchRow[]>(matchFunction, {
        query_embedding: embedding,
        match_count: topK,
        match_threshold: threshold,
        filter: options.filter ?? {},
      })
      throwOnError(result, 'search')

      return (result.data ?? [])
        .map(row => ({
          id: row.id,
          content: row.content,
          metadata: row.metadata ?? undefined,
          score: row.similarity,
        }))
        .filter(row => (row.score ?? 0) > threshold)
        .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
        .slice(0, topK)
    },

    async delete(ids) {
      if (ids.length === 0) return
      const client = await getClient()
      const result = await client.from(table).delete().in('id', ids)
      throwOnError(result, 'delete')
    },
  }
}
