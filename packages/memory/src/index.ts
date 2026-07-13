export { fileChatMemory } from './file-chat'
export { createWebStorageMemory } from './web-storage'
export type { WebStorageLike, WebStorageMemoryMigration, WebStorageMemoryOptions } from './web-storage'

export { sqliteChatMemory } from './sqlite'
export type { SqliteChatMemoryConfig } from './sqlite'

export { tursoChatMemory } from './turso'
export type { TursoChatMemoryConfig } from './turso'

export { redisChatMemory } from './redis-chat'
export type { RedisChatMemoryConfig } from './redis-chat'

export { redisVectorMemory } from './redis-vector'
export type { RedisVectorMemoryConfig } from './redis-vector'

export { fileVectorMemory } from './file-vector'
export type { FileVectorMemoryConfig } from './file-vector'

export type { VectorStore, VectorStoreDocument, VectorStoreResult } from './vector-store'
export type { RedisClientAdapter, RedisConnectionConfig } from './redis-client'

export {
  createInMemoryPersonalization,
  renderProfileContext,
} from './personalization'
export type {
  PersonalizationProfile,
  PersonalizationStore,
} from './personalization'

export { createInMemoryGraph } from './graph'
export type { GraphMemory, GraphNode, GraphEdge, GraphQuery } from './graph'
export {
  pgvector,
  pinecone,
  qdrant,
  chroma,
  upstashVector,
  supabaseVectorStore,
  weaviateVectorStore,
  milvusVectorStore,
  mongoAtlasVectorStore,
  matchesFilter,
} from './vector'
export type {
  PgVectorConfig,
  PgVectorRunner,
  PineconeConfig,
  QdrantConfig,
  ChromaConfig,
  UpstashVectorConfig,
  SupabaseVectorStoreConfig,
  WeaviateConfig,
  MilvusConfig,
  MongoAtlasVectorConfig,
  MongoCollectionLike,
} from './vector'

export { createEncryptedMemory } from './encrypted'
export type { EncryptedMemoryOptions, EncryptedEnvelope } from './encrypted'

export { createHierarchicalMemory } from './hierarchical'
export type {
  HierarchicalMemory,
  HierarchicalMemoryOptions,
  HierarchicalRecall,
} from './hierarchical'

export { forgetSubject, makeForgettable } from './forget'
export type {
  ForgettableMemory,
  ForgetReport,
  ForgetSubjectResult,
} from './forget'

export {
  wrapChatMemoryWithRedaction,
  wrapVectorMemoryWithRedaction,
} from './redaction'
export type {
  ChatMemoryRedactionOptions,
  VectorMemoryRedactionOptions,
  RedactionMode,
} from './redaction'

// Key-value memory store (AgentskitMemoryStore) — generic get(key)/set(key,value)
// with TTL + max-key eviction, complementing the conversation ChatMemory model.
// Backends: in-memory / file / sqlite / localstorage / redis / vector.
export type {
  AgentskitMemoryStore,
  KvEntry,
  KvMemoryConfig,
  InMemoryKvConfig,
  FileKvConfig,
  SqliteKvConfig,
  RedisKvConfig,
  VectorKvConfig,
  LocalStorageKvConfig,
  RedisLike,
  SqliteLike,
  SqliteStmt,
  SqliteOpener,
  MemoryVectorStoreLike,
  MemoryEmbedderLike,
  LocalStorageLike,
} from './kv-store-types'
export { createInMemoryStore, createFileStore, createLocalStorageStore } from './kv-store-basic'
export type { CreateLocalStorageStoreOpts } from './kv-store-basic'
export { createSqliteStore, tryDefaultSqliteOpener } from './kv-store-sqlite'
export type { CreateSqliteStoreOpts } from './kv-store-sqlite'
export { createRedisStore, adaptIoredis, tryDefaultRedisClient } from './kv-store-redis'
export type { CreateRedisStoreOpts } from './kv-store-redis'
export { createVectorStore } from './kv-store-vector'
export type { CreateVectorStoreOpts } from './kv-store-vector'
export {
  createKvMemoryFromConfig,
  createKvMemoryFromConfigAuto,
  MemoryBackendNotImplementedError,
  MEMORY_BACKEND_SUPPORT,
  isMemoryBackendSupported,
} from './kv-store-factory'
export type { CreateKvMemoryFromConfigOpts, MemoryBackendStatus } from './kv-store-factory'
