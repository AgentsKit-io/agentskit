import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createClient } from 'redis'

/**
 * Per-IP rate limit for the ask-docs route. Uses Redis protocol when REDIS_URL
 * is configured (Railway/private-network friendly), then Upstash REST when
 * configured; falls back to a per-instance in-memory window otherwise so local
 * dev and unconfigured deploys still work.
 */
const LIMIT = 8
const WINDOW_SEC = 60
const PREFIX = 'ask-docs'

export interface RateLimitResult {
  ok: boolean
  retryAfterSec: number
}

// ── In-memory fallback (per-instance, resets on cold start) ─────────────────
const memHits = new Map<string, { count: number; resetAt: number }>()

function memLimit(ip: string): RateLimitResult {
  const now = Date.now()
  const entry = memHits.get(ip)
  if (!entry || entry.resetAt < now) {
    memHits.set(ip, { count: 1, resetAt: now + WINDOW_SEC * 1000 })
    return { ok: true, retryAfterSec: 0 }
  }
  entry.count += 1
  if (entry.count > LIMIT) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfterSec: 0 }
}

// ── Redis protocol (durable) ────────────────────────────────────────────────
interface RedisProtocolLimiter {
  limit(ip: string): Promise<RateLimitResult>
}

let redisProtocolLimiter: RedisProtocolLimiter | null | undefined

const REDIS_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`

function normalizeRedisUrl(raw: string): { url: string; family: 0 | 4 | 6 } {
  const parsed = new URL(raw)
  const familyParam = parsed.searchParams.get('family')
  if (familyParam) parsed.searchParams.delete('family')
  const requested = Number(process.env.REDIS_FAMILY ?? familyParam ?? 0)
  const family: 0 | 4 | 6 = requested === 4 || requested === 6 ? requested : 0
  return { url: parsed.toString(), family }
}

function parseRedisEvalResult(value: unknown): { count: number; ttl: number } {
  if (!Array.isArray(value)) return { count: 0, ttl: WINDOW_SEC }
  const [countRaw, ttlRaw] = value
  const count = Number(countRaw)
  const ttl = Number(ttlRaw)
  return {
    count: Number.isFinite(count) ? count : 0,
    ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : WINDOW_SEC,
  }
}

function getRedisProtocolLimiter(): RedisProtocolLimiter | null {
  if (redisProtocolLimiter !== undefined) return redisProtocolLimiter
  const raw = process.env.REDIS_URL ?? process.env.ASK_REDIS_URL
  if (!raw) {
    redisProtocolLimiter = null
    return redisProtocolLimiter
  }

  const { url, family } = normalizeRedisUrl(raw)
  const client = createClient({ url, socket: { family } })
  client.on('error', (err: unknown) => {
    console.warn('[ask-rate-limit] Redis protocol limiter error:', err instanceof Error ? err.message : String(err))
  })
  const ready = client.connect()

  redisProtocolLimiter = {
    async limit(ip: string): Promise<RateLimitResult> {
      await ready
      const key = `${PREFIX}:rl:${ip}`
      const result = parseRedisEvalResult(
        await client.eval(REDIS_WINDOW_SCRIPT, {
          keys: [key],
          arguments: [String(WINDOW_SEC)],
        }),
      )
      return {
        ok: result.count <= LIMIT,
        retryAfterSec: result.count <= LIMIT ? 0 : Math.max(1, result.ttl),
      }
    },
  }
  return redisProtocolLimiter
}

// ── Upstash (durable) ───────────────────────────────────────────────────────
let limiter: Ratelimit | null = null

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(LIMIT, `${WINDOW_SEC} s`),
    prefix: PREFIX,
    analytics: false,
  })
  return limiter
}

export async function rateLimit(ip: string): Promise<RateLimitResult> {
  const redisLimiter = getRedisProtocolLimiter()
  if (redisLimiter) {
    try {
      return await redisLimiter.limit(ip)
    } catch {
      return memLimit(ip)
    }
  }

  const l = getLimiter()
  if (!l) return memLimit(ip)
  try {
    const r = await l.limit(ip)
    return {
      ok: r.success,
      retryAfterSec: r.success ? 0 : Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
    }
  } catch {
    // Never let a limiter outage take down the route — fall back to in-memory.
    return memLimit(ip)
  }
}
