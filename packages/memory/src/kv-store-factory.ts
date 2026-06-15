// KV memory dispatch factory — maps a `KvMemoryConfig.backend` to its store.
// Backends with external drivers (sqlite/redis) or external ports (vector) take
// the dependency injected; `createKvMemoryFromConfigAuto` lazy-loads the optional
// sqlite/redis drivers.

import { MemoryError } from '@agentskit/core'
import { createFileStore, createInMemoryStore, createLocalStorageStore } from './kv-store-basic'
import { createSqliteStore, tryDefaultSqliteOpener } from './kv-store-sqlite'
import { createRedisStore, tryDefaultRedisClient } from './kv-store-redis'
import { createVectorStore } from './kv-store-vector'
import type {
  AgentskitMemoryStore,
  KvMemoryConfig,
  MemoryEmbedderLike,
  MemoryVectorStoreLike,
  RedisLike,
  SqliteOpener,
} from './kv-store-types'

export class MemoryBackendNotImplementedError extends Error {
  readonly code = 'MEMORY_BACKEND_NOT_IMPLEMENTED'
  readonly backend: KvMemoryConfig['backend']
  constructor(backend: KvMemoryConfig['backend']) {
    super(
      `Memory backend "${backend}" is not implemented. Supported: ` +
        `"in-memory", "file", "sqlite", "localstorage", "redis", "vector".`,
    )
    this.backend = backend
  }
}

export type MemoryBackendStatus = 'supported' | 'planned'

export const MEMORY_BACKEND_SUPPORT: Readonly<Record<KvMemoryConfig['backend'], MemoryBackendStatus>> = {
  'in-memory': 'supported',
  file: 'supported',
  sqlite: 'supported',
  redis: 'supported',
  vector: 'supported',
  localstorage: 'supported',
}

export const isMemoryBackendSupported = (backend: KvMemoryConfig['backend']): boolean =>
  MEMORY_BACKEND_SUPPORT[backend] === 'supported'

export interface CreateKvMemoryFromConfigOpts {
  readonly config: KvMemoryConfig
  readonly sqlite?: SqliteOpener
  readonly localStorageFilePath?: string
  readonly redis?: RedisLike
  readonly vectorStore?: MemoryVectorStoreLike
  readonly embedder?: MemoryEmbedderLike
}

export const createKvMemoryFromConfig = ({
  config,
  sqlite,
  localStorageFilePath,
  redis,
  vectorStore,
  embedder,
}: CreateKvMemoryFromConfigOpts): AgentskitMemoryStore => {
  if (config.backend === 'in-memory') return createInMemoryStore(config)
  if (config.backend === 'file') return createFileStore(config)
  if (config.backend === 'localstorage') {
    return createLocalStorageStore({
      config,
      ...(localStorageFilePath ? { filePath: localStorageFilePath } : {}),
    })
  }
  if (config.backend === 'sqlite') {
    if (!sqlite) {
      throw new MemoryError({
        code: 'AK_MEMORY_SQLITE_OPENER_REQUIRED',
        message:
          'createKvMemoryFromConfig: sqlite backend requires an `open` function (better-sqlite3), ' +
          'or call createKvMemoryFromConfigAuto which lazy-imports it.',
      })
    }
    return createSqliteStore({ config, open: sqlite })
  }
  if (config.backend === 'redis') {
    if (!redis) {
      throw new MemoryError({
        code: 'AK_MEMORY_REDIS_CLIENT_REQUIRED',
        message:
          'createKvMemoryFromConfig: redis backend requires a `redis` client, ' +
          'or call createKvMemoryFromConfigAuto which lazy-imports it.',
      })
    }
    return createRedisStore({ config, client: redis })
  }
  if (config.backend === 'vector') {
    if (!vectorStore) {
      throw new MemoryError({
        code: 'AK_MEMORY_VECTOR_STORE_REQUIRED',
        message: 'createKvMemoryFromConfig: vector backend requires a `vectorStore`.',
      })
    }
    if (!embedder) {
      throw new MemoryError({
        code: 'AK_MEMORY_VECTOR_EMBEDDER_REQUIRED',
        message: 'createKvMemoryFromConfig: vector backend requires an `embedder`.',
      })
    }
    return createVectorStore({ config, vectorStore, embedder })
  }
  const exhausted: never = config
  throw new MemoryBackendNotImplementedError((exhausted as { backend: KvMemoryConfig['backend'] }).backend)
}

export const createKvMemoryFromConfigAuto = async (config: KvMemoryConfig): Promise<AgentskitMemoryStore> => {
  if (config.backend === 'sqlite') {
    const sqlite = await tryDefaultSqliteOpener()
    if (!sqlite) {
      throw new MemoryError({
        code: 'AK_MEMORY_SQLITE_DRIVER_MISSING',
        message: 'createKvMemoryFromConfigAuto: sqlite backend needs `better-sqlite3` (pnpm add better-sqlite3).',
      })
    }
    return createKvMemoryFromConfig({ config, sqlite })
  }
  if (config.backend === 'redis') {
    const redis = await tryDefaultRedisClient(config.url)
    if (!redis) {
      throw new MemoryError({
        code: 'AK_MEMORY_REDIS_DRIVER_MISSING',
        message: 'createKvMemoryFromConfigAuto: redis backend needs `redis` (pnpm add redis).',
      })
    }
    return createKvMemoryFromConfig({ config, redis })
  }
  if (config.backend === 'vector') {
    throw new MemoryError({
      code: 'AK_MEMORY_VECTOR_STORE_REQUIRED',
      message: 'createKvMemoryFromConfigAuto: vector backend requires an injected vectorStore + embedder.',
    })
  }
  return createKvMemoryFromConfig({ config })
}
