// in-memory / file / localstorage KV backends.

import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, basename, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import {
  enforceMaxMessages,
  isExpired,
  type AgentskitMemoryStore,
  type FileKvConfig,
  type InMemoryKvConfig,
  type KvEntry,
  type LocalStorageKvConfig,
  type LocalStorageLike,
  validateKvRetention,
} from './kv-store-types'

const fileWriteQueues = new Map<string, Promise<void>>()

const enqueueFileWrite = (path: string, task: () => Promise<void>): Promise<void> => {
  const previous = fileWriteQueues.get(path) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(task)
  fileWriteQueues.set(path, next)
  void next.finally(() => {
    if (fileWriteQueues.get(path) === next) fileWriteQueues.delete(path)
  }).catch(() => {})
  return next
}

const writeFileAtomically = async (path: string, contents: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true })
  const tempPath = join(dirname(path), `.${basename(path)}.${randomBytes(8).toString('hex')}.tmp`)
  try {
    await writeFile(tempPath, contents, { encoding: 'utf8', mode: 0o600 })
    await rename(tempPath, path)
  } finally {
    await unlink(tempPath).catch(() => {})
  }
}

const removeExpiredFileEntry = (
  path: string,
  key: string,
  ttlSeconds: number | undefined,
  load: () => Promise<Map<string, KvEntry>>,
  persist: (map: Map<string, KvEntry>) => Promise<void>,
): Promise<void> => enqueueFileWrite(path, async () => {
  const map = await load()
  const entry = map.get(key)
  if (entry && isExpired(entry, ttlSeconds, Date.now())) {
    map.delete(key)
    await persist(map)
  }
})

/** Creates an in-memory key-value store with optional TTL and size limits.
 * @param config Backend and retention settings.
 * @returns A key-value store backed by a process-local map.
 * @throws {ConfigError} When retention limits are invalid.
 */
export const createInMemoryStore = (config: InMemoryKvConfig): AgentskitMemoryStore => {
  validateKvRetention(config)
  const store = new Map<string, KvEntry>()
  return {
    id: 'in-memory',
    async get(key) {
      const entry = store.get(key)
      if (!entry) return undefined
      if (isExpired(entry, config.ttlSeconds, Date.now())) {
        store.delete(key)
        return undefined
      }
      return entry.value
    },
    async set(key, value) {
      store.set(key, { value, insertedAt: Date.now() })
      enforceMaxMessages(store, config.maxMessages)
    },
  }
}

/** Creates a JSON file key-value store with atomic file replacement.
 * @param config File path and optional retention settings.
 * @returns A persistent key-value store backed by the configured file.
 */
export const createFileStore = (config: FileKvConfig): AgentskitMemoryStore => {
  const path = config.path

  const load = async (): Promise<Map<string, KvEntry>> => {
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8')) as Record<string, KvEntry>
      return new Map(Object.entries(parsed))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return new Map()
      throw err
    }
  }

  const persist = async (map: Map<string, KvEntry>): Promise<void> => {
    await writeFileAtomically(path, JSON.stringify(Object.fromEntries(map), null, 2))
  }

  return {
    id: `file:${path}`,
    async get(key) {
      const map = await load()
      const entry = map.get(key)
      if (!entry) return undefined
      if (isExpired(entry, config.ttlSeconds, Date.now())) {
        await removeExpiredFileEntry(path, key, config.ttlSeconds, load, persist)
        return undefined
      }
      return entry.value
    },
    async set(key, value) {
      await enqueueFileWrite(path, async () => {
        const map = await load()
        map.set(key, { value, insertedAt: Date.now() })
        enforceMaxMessages(map, config.maxMessages)
        await persist(map)
      })
    },
  }
}

/** Options for creating a browser local-storage or file fallback store. */
export interface CreateLocalStorageStoreOpts {
  readonly config: LocalStorageKvConfig
  readonly storage?: LocalStorageLike
  readonly filePath?: string
}

const resolveLocalStorage = (): LocalStorageLike | undefined => {
  const maybe = (globalThis as { localStorage?: LocalStorageLike }).localStorage
  return maybe && typeof maybe.getItem === 'function' && typeof maybe.setItem === 'function' ? maybe : undefined
}

const defaultLocalStoragePath = (): string => `${process.cwd()}/.agentskit/memory-localstorage.json`

/** Creates a local-storage store, falling back to a JSON file when unavailable.
 * @param options Storage configuration and optional storage/file adapters.
 * @returns A key-value store backed by Web Storage or the configured file.
 * @throws {ConfigError} When retention limits are invalid.
 */
export const createLocalStorageStore = ({
  config,
  storage = resolveLocalStorage(),
  filePath = defaultLocalStoragePath(),
}: CreateLocalStorageStoreOpts): AgentskitMemoryStore => {
  validateKvRetention(config)
  const key = config.key

  const mapFromJson = (raw: string | null): Map<string, KvEntry> =>
    raw ? new Map(Object.entries(JSON.parse(raw) as Record<string, KvEntry>)) : new Map()

  const loadFromFile = async (): Promise<Map<string, KvEntry>> => {
    try {
      return mapFromJson(await readFile(filePath, 'utf8'))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return new Map()
      throw err
    }
  }

  const loadSync = (): Map<string, KvEntry> => mapFromJson(storage!.getItem(key))
  const persist = async (map: Map<string, KvEntry>): Promise<void> => {
    await writeFileAtomically(filePath, JSON.stringify(Object.fromEntries(map), null, 2))
  }

  const persistSync = (map: Map<string, KvEntry>): void => {
    storage!.setItem(key, JSON.stringify(Object.fromEntries(map), null, 2))
  }

  return {
    id: storage ? `localstorage:${key}` : `localstorage-file:${filePath}:${key}`,
    async get(itemKey) {
      const map = storage ? loadSync() : await loadFromFile()
      const entry = map.get(itemKey)
      if (!entry) return undefined
      if (isExpired(entry, config.ttlSeconds, Date.now())) {
        if (storage) {
          map.delete(itemKey)
          persistSync(map)
        } else {
          await removeExpiredFileEntry(filePath, itemKey, config.ttlSeconds, loadFromFile, persist)
        }
        return undefined
      }
      return entry.value
    },
    async set(itemKey, value) {
      if (storage) {
        const map = loadSync()
        map.set(itemKey, { value, insertedAt: Date.now() })
        enforceMaxMessages(map, config.maxMessages)
        persistSync(map)
        return
      }
      await enqueueFileWrite(filePath, async () => {
        const map = await loadFromFile()
        map.set(itemKey, { value, insertedAt: Date.now() })
        enforceMaxMessages(map, config.maxMessages)
        await persist(map)
      })
    },
  }
}
