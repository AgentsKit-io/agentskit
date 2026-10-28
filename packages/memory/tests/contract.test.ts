import { afterEach, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInMemoryMemory } from '@agentskit/core'
import type { ChatMemory, EmbedFn } from '@agentskit/core'
import { fileChatMemory } from '../src/file-chat'
import { fileVectorMemory } from '../src/file-vector'
import { sqliteChatMemory } from '../src/sqlite'
import { createWebStorageMemory, type WebStorageLike } from '../src/web-storage'
import { createEncryptedMemory } from '../src/encrypted'
import { redisChatMemory } from '../src/redis-chat'
import { redisVectorMemory } from '../src/redis-vector'
import type { RedisClientAdapter } from '../src/redis-client'
import { wrapChatMemoryWithRedaction, wrapVectorMemoryWithRedaction } from '../src/redaction'
import {
  listUncovered,
  runChatMemoryContract,
  runEmbedFnContract,
  runVectorMemoryContract,
} from './contract'

const tmpDirs: string[] = []
const tmp = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'agentskit-contract-'))
  tmpDirs.push(dir)
  return dir
}
afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map(d => rm(d, { recursive: true, force: true })))
})

// --- fakes (same shape the per-backend tests already use) ---

function mockRedisKv(): RedisClientAdapter {
  const store = new Map<string, string>()
  return {
    async get(key) { return store.get(key) ?? null },
    async set(key, value) { store.set(key, value) },
    async del(key) { for (const k of Array.isArray(key) ? key : [key]) store.delete(k) },
    async keys(pattern) {
      const prefix = pattern.replace(/\*/g, '')
      return [...store.keys()].filter(k => k.startsWith(prefix))
    },
    async disconnect() {},
    async call() { return null },
  }
}

/** RediSearch fake: HSET stores hashes, FT.SEARCH does a real cosine KNN. */
function mockRediSearch(): RedisClientAdapter {
  const hashes = new Map<string, Map<string, string | Buffer>>()
  const floats = (b: Buffer): number[] => Array.from({ length: b.length / 4 }, (_, i) => b.readFloatLE(i * 4))
  const cosine = (a: number[], b: number[]): number => {
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
    return na && nb ? dot / Math.sqrt(na * nb) : 0
  }
  return {
    async get() { return null },
    async set() {},
    async del(key) { for (const k of Array.isArray(key) ? key : [key]) hashes.delete(k) },
    async keys() { return [] },
    async disconnect() {},
    async call(command, ...args) {
      const cmd = command.toUpperCase()
      if (cmd === 'FT.CREATE') return 'OK'
      if (cmd === 'HSET') {
        const fields = new Map<string, string | Buffer>()
        for (let i = 1; i < args.length; i += 2) fields.set(String(args[i]), args[i + 1] as string | Buffer)
        hashes.set(String(args[0]), fields)
        return fields.size
      }
      if (cmd === 'FT.SEARCH') {
        const topK = Number(/KNN (\d+)/.exec(String(args[1]))?.[1] ?? 10)
        const vec = floats(args[args.indexOf('vec') + 1] as Buffer)
        const ranked = [...hashes.entries()]
          .map(([key, f]) => ({ key, f, distance: 1 - cosine(vec, floats(f.get('embedding') as Buffer)) }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, topK)
        const out: unknown[] = [ranked.length]
        for (const { key, f, distance } of ranked) {
          out.push(key, ['content', String(f.get('content')), 'metadata', String(f.get('metadata')), 'score', String(distance)])
        }
        return out
      }
      return null
    },
  }
}

function webStorage(): WebStorageLike {
  const values = new Map<string, string>()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
  }
}

function fakeLibsqlClient() {
  const db = new Map<string, string>()
  return {
    execute: vi.fn(async ({ sql, args }: { sql: string; args?: unknown[] }) => {
      const s = sql.replace(/\s+/g, ' ').trim().toUpperCase()
      if (s.startsWith('SELECT')) {
        const val = db.get(args?.[0] as string)
        return { rows: val ? [{ messages: val }] : [] }
      }
      if (s.startsWith('INSERT INTO')) db.set(args?.[0] as string, args?.[1] as string)
      if (s.startsWith('DELETE')) db.delete(args?.[0] as string)
      return { rows: [] }
    }),
  }
}

const key = new Uint8Array(32).map((_, i) => i)

// --- ChatMemory backends (offline) ---

runChatMemoryContract({ name: 'core createInMemoryMemory', build: () => createInMemoryMemory() })

runChatMemoryContract({
  name: 'fileChatMemory',
  build: async () => fileChatMemory(join(await tmp(), 'chat.json')),
})

runChatMemoryContract({
  name: 'sqliteChatMemory',
  build: async () => sqliteChatMemory({ path: join(await tmp(), 'chat.db') }),
})

runChatMemoryContract({
  name: 'createWebStorageMemory',
  build: () => {
    const storage = webStorage()
    return createWebStorageMemory({ key: 'chat', getStorage: () => storage })
  },
})

runChatMemoryContract({
  name: 'createEncryptedMemory(createInMemoryMemory)',
  build: () => createEncryptedMemory({ backing: createInMemoryMemory(), key }),
})

runChatMemoryContract({
  name: 'redisChatMemory (mock client)',
  build: () => redisChatMemory({ url: '', client: mockRedisKv() }),
})

runChatMemoryContract({
  name: 'tursoChatMemory (fake @libsql/client)',
  build: async (): Promise<ChatMemory> => {
    vi.resetModules()
    vi.doMock('@libsql/client', () => ({ createClient: () => fakeLibsqlClient() }))
    const { tursoChatMemory } = await import('../src/turso')
    return tursoChatMemory({ url: 'file::memory:' })
  },
  cleanup: () => { vi.doUnmock('@libsql/client') },
})

runChatMemoryContract({
  name: 'wrapChatMemoryWithRedaction(createInMemoryMemory)',
  build: () => wrapChatMemoryWithRedaction(createInMemoryMemory(), { rules: [] }),
})

// --- VectorMemory backends (offline) ---

runVectorMemoryContract({
  name: 'fileVectorMemory (real vectra index)',
  build: async () => fileVectorMemory({ path: await tmp() }),
})

runVectorMemoryContract({
  name: 'redisVectorMemory (RediSearch fake)',
  build: () => redisVectorMemory({ url: '', client: mockRediSearch(), dimensions: 3 }),
})

runVectorMemoryContract({
  name: 'wrapVectorMemoryWithRedaction(redisVectorMemory)',
  build: () => wrapVectorMemoryWithRedaction(
    redisVectorMemory({ url: '', client: mockRediSearch(), dimensions: 3 }),
    { rules: [] },
  ),
})

// --- EmbedFn ---

const hashEmbed: EmbedFn = async text => {
  return Array.from({ length: 4 }, (_, i) => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0) + i) % 9973, 7) / 9973)
}
runEmbedFnContract({
  name: 'deterministic hash embedder (reference)',
  build: () => hashEmbed,
  buildFailing: () => async () => { throw new Error('provider down') },
})

// --- Explicitly not covered ---

listUncovered('ChatMemory contract (ADR 0003 CM1–CM6)', [
  { name: 'postgresChatMemory', reason: 'needs a real PostgreSQL; covered by tests/postgres.integration.test.ts (test:postgres)' },
  { name: 'createInMemoryStore / createFileStore / createLocalStorageStore / createSqliteStore / createRedisStore / createVectorStore (kv-store)', reason: 'implement AgentskitMemoryStore (get/set by key), not ChatMemory or VectorMemory; covered by kv-store-*.test.ts' },
  { name: 'createHierarchicalMemory / createInMemoryGraph / createInMemoryPersonalization / forgetSubject', reason: 'higher-level memory features with their own contracts, not ChatMemory/VectorMemory backends' },
  { name: 'createLocalStorageMemory (core)', reason: 'covered through createWebStorageMemory; core keeps no DOM storage fake' },
])

listUncovered('VectorMemory contract (ADR 0003 VM1–VM8)', [
  { name: 'pgvector', reason: 'needs PostgreSQL + pgvector (runner is injected); covered by vector*.test.ts with a stub runner' },
  { name: 'pinecone / qdrant / chroma / upstashVector / supabaseVectorStore / weaviateVectorStore / milvusVectorStore / mongoAtlasVectorStore', reason: 'managed services reached over HTTP; the wire-level fakes in vector.test.ts / vector-extra.test.ts / supabase*.test.ts / chroma-v2.test.ts do not compute similarity, so VM3/VM5 cannot be exercised offline' },
])
