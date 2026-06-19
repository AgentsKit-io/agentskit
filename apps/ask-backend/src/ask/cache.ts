import { Redis as UpstashRedis } from '@upstash/redis'
import net from 'node:net'
import tls from 'node:tls'
import type { EmbedFn, RetrievedDocument } from '@agentskit/core'
import type { UiEvent } from './protocol'

export interface AskCacheOptions {
  namespace?: string
  answerTtlMs?: number
  retrievalTtlMs?: number
  semanticTtlMs?: number
  semanticThreshold?: number
  maxSemanticEntries?: number
  embed?: EmbedFn
}

export interface AskCacheKey {
  corpus: string
  persona: string
  promptVersion: string
  query: string
}

export interface CachedAnswer {
  events: UiEvent[]
  createdAt: number
  model: string
  source: 'exact' | 'semantic'
}

interface StoredAnswer {
  events: UiEvent[]
  createdAt: number
  model: string
}

interface SemanticEntry extends StoredAnswer {
  key: string
  vector: number[]
  expiresAt: number
}

interface StoredRetrieval {
  docs: RetrievedDocument[]
  createdAt: number
}

interface PersistentCache {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown, ttlMs: number): Promise<void>
}

function hashString(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function normalizeQuery(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;:…]+$/g, '')
    .trim()
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) dot += a[i]! * b[i]!
  return dot
}

class UpstashCache implements PersistentCache {
  private readonly client: UpstashRedis

  constructor(url: string, token: string) {
    this.client = new UpstashRedis({ url, token })
  }

  async get<T>(key: string): Promise<T | undefined> {
    return (await this.client.get<T>(key)) ?? undefined
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    await this.client.set(key, value, { px: ttlMs })
  }
}

class RailwayRedisCache implements PersistentCache {
  constructor(private readonly url: string) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await redisCommand(this.url, ['GET', key])
    if (!raw) return undefined
    return JSON.parse(raw) as T
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    await redisCommand(this.url, ['SET', key, JSON.stringify(value), 'PX', String(ttlMs)])
  }
}

function encodeRedisCommand(parts: string[]): string {
  return `*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join('')}`
}

function parseRedisReply(buffer: Buffer, offset = 0): { value: string | null; offset: number } | undefined {
  if (offset >= buffer.length) return undefined
  const prefix = String.fromCharCode(buffer[offset]!)
  const lineEnd = buffer.indexOf('\r\n', offset)
  if (lineEnd === -1) return undefined
  const line = buffer.subarray(offset + 1, lineEnd).toString('utf8')
  const next = lineEnd + 2

  if (prefix === '+') return { value: line, offset: next }
  if (prefix === ':') return { value: line, offset: next }
  if (prefix === '-') throw new Error(line)
  if (prefix !== '$') throw new Error(`unsupported redis reply "${prefix}"`)

  const len = Number(line)
  if (len === -1) return { value: null, offset: next }
  const end = next + len
  if (buffer.length < end + 2) return undefined
  return { value: buffer.subarray(next, end).toString('utf8'), offset: end + 2 }
}

async function redisCommand(redisUrl: string, command: string[]): Promise<string | null> {
  const url = new URL(redisUrl)
  const isTls = url.protocol === 'rediss:'
  const port = Number(url.port || (isTls ? 6380 : 6379))
  const host = url.hostname
  const password = url.password ? decodeURIComponent(url.password) : undefined
  const username = url.username ? decodeURIComponent(url.username) : undefined
  const db = url.pathname.replace(/^\//, '')
  const commands: string[][] = []
  if (password) commands.push(username ? ['AUTH', username, password] : ['AUTH', password])
  if (db) commands.push(['SELECT', db])
  commands.push(command)

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const socket = isTls
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('redis command timed out'))
    }, 1500)

    socket.once('connect', () => {
      socket.write(commands.map(encodeRedisCommand).join(''))
    })
    socket.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      const buffer = Buffer.concat(chunks)
      try {
        let offset = 0
        let value: string | null = null
        for (let i = 0; i < commands.length; i++) {
          const parsed = parseRedisReply(buffer, offset)
          if (!parsed) return
          value = parsed.value
          offset = parsed.offset
        }
        clearTimeout(timer)
        socket.end()
        resolve(value)
      } catch (err) {
        clearTimeout(timer)
        socket.destroy()
        reject(err)
      }
    })
    socket.once('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function persistentCache(): PersistentCache | null {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) return new RailwayRedisCache(redisUrl)

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new UpstashCache(url, token)
}

export class AskCache {
  private readonly namespace: string
  private readonly answerTtlMs: number
  private readonly retrievalTtlMs: number
  private readonly semanticTtlMs: number
  private readonly semanticThreshold: number
  private readonly maxSemanticEntries: number
  private readonly embed?: EmbedFn
  private readonly persistent = persistentCache()
  private readonly answers = new Map<string, StoredAnswer & { expiresAt: number }>()
  private readonly retrievals = new Map<string, StoredRetrieval & { expiresAt: number }>()
  private readonly semantic: SemanticEntry[] = []

  constructor(options: AskCacheOptions = {}) {
    this.namespace = options.namespace ?? 'ask'
    this.answerTtlMs = options.answerTtlMs ?? 30 * 24 * 60 * 60 * 1000
    this.retrievalTtlMs = options.retrievalTtlMs ?? 7 * 24 * 60 * 60 * 1000
    this.semanticTtlMs = options.semanticTtlMs ?? this.answerTtlMs
    this.semanticThreshold = options.semanticThreshold ?? 0.86
    this.maxSemanticEntries = options.maxSemanticEntries ?? 400
    this.embed = options.embed
  }

  answerKey(input: AskCacheKey): string {
    return `${this.namespace}:answer:${input.corpus}:${input.persona}:${input.promptVersion}:${hashString(normalizeQuery(input.query))}`
  }

  retrievalKey(input: AskCacheKey): string {
    return `${this.namespace}:retrieval:${input.corpus}:${input.promptVersion}:${hashString(normalizeQuery(input.query))}`
  }

  async getAnswer(input: AskCacheKey): Promise<CachedAnswer | undefined> {
    const key = this.answerKey(input)
    const exact = await this.getExactAnswer(key)
    if (exact) return { ...exact, source: 'exact' }

    const semantic = await this.getSemanticAnswer(key, input.query)
    return semantic ? { ...semantic, source: 'semantic' } : undefined
  }

  async setAnswer(input: AskCacheKey, value: StoredAnswer): Promise<void> {
    if (value.events.some((event) => event.type === 'error')) return
    const key = this.answerKey(input)
    const expiresAt = Date.now() + this.answerTtlMs
    this.answers.set(key, { ...value, expiresAt })
    await this.redisSet(key, value, this.answerTtlMs)
    await this.setSemanticAnswer(key, input.query, value)
  }

  async getRetrieval(input: AskCacheKey): Promise<RetrievedDocument[] | undefined> {
    const key = this.retrievalKey(input)
    const now = Date.now()
    const mem = this.retrievals.get(key)
    if (mem && mem.expiresAt >= now) return mem.docs
    if (mem) this.retrievals.delete(key)

    const stored = await this.redisGet<StoredRetrieval>(key)
    if (!stored) return undefined
    this.retrievals.set(key, { ...stored, expiresAt: now + this.retrievalTtlMs })
    return stored.docs
  }

  async setRetrieval(input: AskCacheKey, docs: RetrievedDocument[]): Promise<void> {
    const value: StoredRetrieval = { docs, createdAt: Date.now() }
    const key = this.retrievalKey(input)
    this.retrievals.set(key, { ...value, expiresAt: Date.now() + this.retrievalTtlMs })
    await this.redisSet(key, value, this.retrievalTtlMs)
  }

  private async getExactAnswer(key: string): Promise<StoredAnswer | undefined> {
    const now = Date.now()
    const mem = this.answers.get(key)
    if (mem && mem.expiresAt >= now) return mem
    if (mem) this.answers.delete(key)

    const stored = await this.redisGet<StoredAnswer>(key)
    if (!stored) return undefined
    this.answers.set(key, { ...stored, expiresAt: now + this.answerTtlMs })
    return stored
  }

  private async getSemanticAnswer(key: string, query: string): Promise<StoredAnswer | undefined> {
    if (!this.embed) return undefined
    this.pruneSemantic()
    let vector: number[]
    try {
      vector = await this.embed(normalizeQuery(query))
    } catch {
      return undefined
    }
    let best: SemanticEntry | undefined
    let bestScore = -1
    for (const entry of this.semantic) {
      if (entry.key === key) continue
      const score = cosine(vector, entry.vector)
      if (score > bestScore) {
        bestScore = score
        best = entry
      }
    }
    if (!best || bestScore < this.semanticThreshold) return undefined
    return { events: best.events, createdAt: best.createdAt, model: best.model }
  }

  private async setSemanticAnswer(key: string, query: string, value: StoredAnswer): Promise<void> {
    if (!this.embed) return
    try {
      const vector = await this.embed(normalizeQuery(query))
      this.semantic.unshift({ ...value, key, vector, expiresAt: Date.now() + this.semanticTtlMs })
      this.pruneSemantic()
    } catch {
      // Semantic cache is opportunistic; exact cache already stored the answer.
    }
  }

  private pruneSemantic(): void {
    const now = Date.now()
    for (let i = this.semantic.length - 1; i >= 0; i--) {
      if (this.semantic[i]!.expiresAt < now) this.semantic.splice(i, 1)
    }
    if (this.semantic.length > this.maxSemanticEntries) {
      this.semantic.splice(this.maxSemanticEntries)
    }
  }

  private async redisGet<T>(key: string): Promise<T | undefined> {
    if (!this.persistent) return undefined
    try {
      return (await this.persistent.get<T>(key)) ?? undefined
    } catch {
      return undefined
    }
  }

  private async redisSet(key: string, value: unknown, ttlMs: number): Promise<void> {
    if (!this.persistent) return
    try {
      await this.persistent.set(key, value, ttlMs)
    } catch {
      // Redis is a speed layer. Never fail user requests because cache write failed.
    }
  }
}
