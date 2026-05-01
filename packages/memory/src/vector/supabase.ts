import type { VectorMemory } from '@agentskit/core'
import { pgvector, type PgVectorRunner } from './pgvector'

export interface SupabaseVectorStoreConfig {
  /** Supabase project URL, e.g. `https://xyz.supabase.co`. */
  url: string
  /** Service-role key (server-side only). */
  serviceRoleKey: string
  /** Table name. Default `agentskit_vectors`. */
  table?: string
  /** Default topK for search. Default 10. */
  topK?: number
}

interface SupabaseRpcResult<T> {
  data: T | null
  error: { message: string } | null
}

interface SupabasePostgrestQuery {
  rpc<T>(fn: string, params?: Record<string, unknown>): Promise<SupabaseRpcResult<T>>
}

interface SupabaseClientLike {
  from(table: string): SupabasePostgrestQuery & {
    select(columns?: string): unknown
    insert(rows: unknown[]): unknown
    upsert(rows: unknown[], opts?: { onConflict?: string }): unknown
    delete(): { in(column: string, values: unknown[]): unknown }
  }
  rpc<T>(fn: string, params?: Record<string, unknown>): Promise<SupabaseRpcResult<T>>
}

interface SupabaseModule {
  createClient(url: string, key: string): SupabaseClientLike
}

let cachedSdk: Promise<SupabaseModule> | null = null
async function loadSdk(): Promise<SupabaseModule> {
  if (!cachedSdk) {
    cachedSdk = (async () => {
      try {
        const moduleId = '@supabase/supabase-js'
        return (await import(/* @vite-ignore */ moduleId)) as unknown as SupabaseModule
      } catch {
        throw new Error(
          'Install @supabase/supabase-js to use supabaseVectorStore: npm install @supabase/supabase-js',
        )
      }
    })()
  }
  return cachedSdk
}

function buildRunner(client: SupabaseClientLike): PgVectorRunner {
  // Supabase has no public raw-SQL API on `supabase-js`. We expose the same
  // shape via a thin wrapper around an `execute_sql` RPC that the user
  // creates server-side; this keeps the pgvector adapter wiring intact.
  return {
    async query<T>(sql: string, params: unknown[]) {
      const result = await client.rpc<T[]>('agentskit_execute_sql', { sql, params })
      if (result.error) throw new Error(`supabase: ${result.error.message}`)
      return { rows: (result.data ?? []) as T[] }
    },
  }
}

/**
 * Supabase-hosted pgvector. Wraps the existing `pgvector` adapter with a
 * Supabase RPC runner so callers don't need to import a separate pg driver.
 *
 * Server-side setup (run once in Supabase SQL editor):
 *   create extension if not exists vector;
 *   create table agentskit_vectors (
 *     id text primary key, content text, embedding vector(1536),
 *     metadata jsonb
 *   );
 *   create or replace function agentskit_execute_sql(sql text, params jsonb)
 *     returns setof json language plpgsql security definer as $$
 *   begin
 *     return query execute sql using params;
 *   end;
 *   $$;
 *
 * `@supabase/supabase-js` is an optional peer dependency loaded lazily.
 */
export function supabaseVectorStore(config: SupabaseVectorStoreConfig): VectorMemory {
  let runnerPromise: Promise<PgVectorRunner> | null = null
  const getRunner = (): Promise<PgVectorRunner> => {
    if (!runnerPromise) {
      runnerPromise = (async () => {
        const sdk = await loadSdk()
        const client = sdk.createClient(config.url, config.serviceRoleKey)
        return buildRunner(client)
      })()
    }
    return runnerPromise
  }

  // Lazy delegate — we don't have a runner until first call.
  let backend: VectorMemory | null = null
  const getBackend = async (): Promise<VectorMemory> => {
    if (!backend) {
      const runner = await getRunner()
      backend = pgvector({
        runner,
        table: config.table,
        topK: config.topK,
      })
    }
    return backend
  }

  return {
    async store(docs) {
      const b = await getBackend()
      return b.store(docs)
    },
    async search(embedding, options) {
      const b = await getBackend()
      return b.search(embedding, options)
    },
    async delete(ids) {
      const b = await getBackend()
      return b.delete?.(ids)
    },
  }
}
