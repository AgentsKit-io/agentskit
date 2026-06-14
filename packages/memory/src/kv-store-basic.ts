// in-memory / file / localstorage KV backends.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  enforceMaxMessages,
  isExpired,
  type AgentskitMemoryStore,
  type FileKvConfig,
  type InMemoryKvConfig,
  type KvEntry,
  type LocalStorageKvConfig,
  type LocalStorageLike,
} from './kv-store-types'

export const createInMemoryStore = (config: InMemoryKvConfig): AgentskitMemoryStore => {
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
  let cache: Map<string, KvEntry> | undefined

  const load = async (): Promise<Map<string, KvEntry>> => {
    if (cache) return cache
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8')) as Record<string, KvEntry>
      cache = new Map(Object.entries(parsed))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') cache = new Map()
      else throw err
    }
    return cache
  }

  const persist = async (map: Map<string, KvEntry>): Promise<void> => {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify(Object.fromEntries(map), null, 2), { encoding: 'utf8', mode: 0o600 })
  }

  return {
    id: `file:${path}`,
    async get(key) {
      const map = await load()
      const entry = map.get(key)
      if (!entry) return undefined
      if (isExpired(entry, config.ttlSeconds, Date.now())) {
        map.delete(key)
        await persist(map)
        return undefined
      }
      return entry.value
    },
    async set(key, value) {
      const map = await load()
      map.set(key, { value, insertedAt: Date.now() })
      enforceMaxMessages(map, config.maxMessages)
      await persist(map)
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
  const key = config.key
  let cache: Map<string, KvEntry> | undefined

  const mapFromJson = (raw: string | null): Map<string, KvEntry> =>
    raw ? new Map(Object.entries(JSON.parse(raw) as Record<string, KvEntry>)) : new Map()

  const loadFromFile = async (): Promise<Map<string, KvEntry>> => {
    if (cache) return cache
    try {
      cache = mapFromJson(await readFile(filePath, 'utf8'))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') cache = new Map()
      else throw err
    }
    return cache
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
        map.delete(itemKey)
        await persist(map)
        return undefined
      }
      return entry.value
    },
    async set(itemKey, value) {
      const map = await load()
      map.set(itemKey, { value, insertedAt: Date.now() })
      enforceMaxMessages(map, config.maxMessages)
      await persist(map)
    },
  }
}
