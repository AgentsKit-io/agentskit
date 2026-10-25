// Key-value memory store (`AgentskitMemoryStore`) — a generic get(key)/set(key,value)
// store with TTL + max-key eviction, complementing the conversation `ChatMemory`
// abstraction. Used for agent scratchpad, pipeline state, and arbitrary JSON
// persistence keyed by string. Backends: in-memory / file / sqlite / localstorage
// / redis / vector.

import { ConfigError, ErrorCodes } from '@agentskit/core'

/** Minimal KV store contract. */
export interface AgentskitMemoryStore {
  readonly id: string | undefined
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

/** Stored value and insertion timestamp used by the KV backends. */
export interface KvEntry {
  readonly value: unknown
  readonly insertedAt: number
}

export const isExpired = (entry: KvEntry, ttlSeconds: number | undefined, now: number): boolean => {
  if (ttlSeconds === undefined) return false
  return now - entry.insertedAt > ttlSeconds * 1000
}

export const enforceMaxMessages = (map: Map<string, KvEntry>, maxMessages: number | undefined): void => {
  if (maxMessages === undefined) return
  while (map.size > maxMessages) {
    const oldest = map.keys().next().value
    if (oldest === undefined) break
    map.delete(oldest)
  }
}

export const validateKvRetention = (config: { readonly maxMessages?: number; readonly ttlSeconds?: number }): void => {
  for (const [name, value] of [['maxMessages', config.maxMessages], ['ttlSeconds', config.ttlSeconds]] as const) {
    if (value === undefined) continue
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `${name} must be a positive safe integer.`,
        hint: 'Use an integer greater than zero for retention and eviction limits.',
      })
    }
  }
}

// --- Config (plain interfaces; a host's Zod-validated config is structurally compatible) ---

interface CommonKvConfig {
  readonly maxMessages?: number
  readonly ttlSeconds?: number
}

/** Configuration for the in-memory key-value backend. */
export interface InMemoryKvConfig extends CommonKvConfig {
  readonly backend: 'in-memory'
}
/** Configuration for the JSON file key-value backend. */
export interface FileKvConfig extends CommonKvConfig {
  readonly backend: 'file'
  readonly path: string
}
/** Configuration for the SQLite key-value backend. */
export interface SqliteKvConfig extends CommonKvConfig {
  readonly backend: 'sqlite'
  readonly path: string
}
/** Configuration for the Redis key-value backend. */
export interface RedisKvConfig extends CommonKvConfig {
  readonly backend: 'redis'
  readonly url: string
  readonly prefix: string
}
/** Configuration for the vector-backed key-value backend. */
export interface VectorKvConfig extends CommonKvConfig {
  readonly backend: 'vector'
  readonly provider: string
  readonly collection: string
}
/** Configuration for the browser local-storage key-value backend. */
export interface LocalStorageKvConfig extends CommonKvConfig {
  readonly backend: 'localstorage'
  readonly key: string
}

/** Discriminated configuration accepted by the KV memory factories. */
export type KvMemoryConfig =
  | InMemoryKvConfig
  | FileKvConfig
  | SqliteKvConfig
  | RedisKvConfig
  | VectorKvConfig
  | LocalStorageKvConfig

// --- Injected-dependency contracts (so the store stays driver-agnostic) ---

/** Minimal Redis client operations required by the memory backends. */
export interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { readonly EX?: number }): Promise<unknown>
  del(key: string): Promise<unknown>
  keys(pattern: string): Promise<readonly string[]>
}

/** Minimal prepared-statement operations used by SQLite memory stores. */
export interface SqliteStmt {
  run(...params: unknown[]): void
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

/** Minimal SQLite database operations required by memory stores. */
export interface SqliteLike {
  exec(sql: string): void
  prepare(sql: string): SqliteStmt
}

/** Opens a SQLite database at the given path. */
export type SqliteOpener = (path: string) => SqliteLike

/** Minimal vector store operations required by vector-backed KV memory. */
export interface MemoryVectorStoreLike {
  upsert(
    rows: readonly {
      readonly chunkId: string
      readonly vec: readonly number[]
      readonly metadata: Record<string, unknown>
    }[],
  ): Promise<void>
  query(
    vec: readonly number[],
    k: number,
    filter?: Record<string, unknown>,
  ): Promise<readonly { readonly chunkId: string; readonly score: number; readonly metadata: Record<string, unknown> }[]>
}

/** Embedder contract used by vector-backed KV memory. */
export interface MemoryEmbedderLike {
  embed(texts: readonly string[]): Promise<number[][]>
}

/** Minimal Web Storage methods required by the local-storage backend. */
export interface LocalStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
