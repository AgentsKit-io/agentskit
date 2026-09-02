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

export const createInMemoryStore = (config: InMemoryKvConfig): AgentskitMemoryStore => {
  validateKvRetention(config)
  const store = new Map<string, KvEntry>()
  const now = () => Date.now()
  return {
    id: 'in-memory',
    async get(key) {
      const entry = store.get(key)
      if (!entry) return undefined
      if (isExpired(entry, config.ttlSeconds, now())) {
        store.delete(key)
        return undefined
      }
      return entry.value
    },
    async set(key, value) {
      store.set(key, { value, insertedAt: now() })
      enforceMaxMessages(store, config.maxMessages)
    },
  }
}

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
    await mkdir(dirname(path), { recursive: true })
    const tempPath = join(dirname(path), `.${basename(path)}.${randomBytes(8).toString('hex')}.tmp`)
    try {
      await writeFile(tempPath, JSON.stringify(Object.fromEntries(map), null, 2), { encoding: 'utf8', mode: 0o600 })
      await rename(tempPath, path)
    } finally {
      try { await unlink(tempPath) } catch { /* rename already published it */ }
    }
  }

  return {
    id: `file:${path}`,
    async get(key) {
      const map = await load()
      const entry = map.get(key)
      if (!entry) return undefined
      if (isExpired(entry, config.ttlSeconds, Date.now())) {
        await enqueueFileWrite(path, async () => {
          const latest = await load()
          const current = latest.get(key)
          if (current && isExpired(current, config.ttlSeconds, Date.now())) {
            latest.delete(key)
            await persist(latest)
          }
        })
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

  const load = async (): Promise<Map<string, KvEntry>> =>
    storage ? mapFromJson(storage.getItem(key)) : loadFromFile()

  const persist = async (map: Map<string, KvEntry>): Promise<void> => {
    const raw = JSON.stringify(Object.fromEntries(map), null, 2)
    if (storage) {
      storage.setItem(key, raw)
      return
    }
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, raw, { encoding: 'utf8', mode: 0o600 })
  }

  return {
    id: storage ? `localstorage:${key}` : `localstorage-file:${filePath}:${key}`,
    async get(itemKey) {
      const map = await load()
      const entry = map.get(itemKey)
      if (!entry) return undefined
      if (isExpired(entry, config.ttlSeconds, Date.now())) {
        if (storage) {
          map.delete(itemKey)
          await persist(map)
        } else {
          await enqueueFileWrite(filePath, async () => {
            const latest = await loadFromFile()
            const current = latest.get(itemKey)
            if (current && isExpired(current, config.ttlSeconds, Date.now())) {
              latest.delete(itemKey)
              await persist(latest)
            }
          })
        }
        return undefined
      }
      return entry.value
    },
    async set(itemKey, value) {
      if (storage) {
        const map = await load()
        map.set(itemKey, { value, insertedAt: Date.now() })
        enforceMaxMessages(map, config.maxMessages)
        await persist(map)
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
