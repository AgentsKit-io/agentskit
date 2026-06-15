// Key-value memory store (`AgentskitMemoryStore`) — a generic get(key)/set(key,value)
// store with TTL + max-key eviction, complementing the conversation `ChatMemory`
// abstraction. Used for agent scratchpad, pipeline state, and arbitrary JSON
// persistence keyed by string. Backends: in-memory / file / sqlite / localstorage
// / redis / vector.

/** Minimal KV store contract. */
export interface AgentskitMemoryStore {
  readonly id: string | undefined
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

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

// --- Config (plain interfaces; a host's Zod-validated config is structurally compatible) ---

interface CommonKvConfig {
  readonly maxMessages?: number
  readonly ttlSeconds?: number
}

export interface InMemoryKvConfig extends CommonKvConfig {
  readonly backend: 'in-memory'
}
export interface FileKvConfig extends CommonKvConfig {
  readonly backend: 'file'
  readonly path: string
}
export interface SqliteKvConfig extends CommonKvConfig {
  readonly backend: 'sqlite'
  readonly path: string
}
export interface RedisKvConfig extends CommonKvConfig {
  readonly backend: 'redis'
  readonly url: string
  readonly prefix: string
}
export interface VectorKvConfig extends CommonKvConfig {
  readonly backend: 'vector'
  readonly provider: string
  readonly collection: string
}
export interface LocalStorageKvConfig extends CommonKvConfig {
  readonly backend: 'localstorage'
  readonly key: string
}

export type KvMemoryConfig =
  | InMemoryKvConfig
  | FileKvConfig
  | SqliteKvConfig
  | RedisKvConfig
  | VectorKvConfig
  | LocalStorageKvConfig

// --- Injected-dependency contracts (so the store stays driver-agnostic) ---

export interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { readonly EX?: number }): Promise<unknown>
  del(key: string): Promise<unknown>
  keys(pattern: string): Promise<readonly string[]>
}

export interface SqliteStmt {
  run(...params: unknown[]): void
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

export interface SqliteLike {
  exec(sql: string): void
  prepare(sql: string): SqliteStmt
}

export type SqliteOpener = (path: string) => SqliteLike

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

export interface MemoryEmbedderLike {
  embed(texts: readonly string[]): Promise<number[][]>
}

export interface LocalStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
