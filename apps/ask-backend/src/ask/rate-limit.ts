import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Per-IP rate limit for the ask-docs route. Uses Upstash Redis when configured
 * (durable across serverless cold starts / regions); falls back to a per-instance
 * in-memory window otherwise so local dev and unconfigured deploys still work.
 */
const LIMIT = 8
const WINDOW_SEC = 60

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
    prefix: 'ask-docs',
    analytics: false,
  })
  return limiter
}

export async function rateLimit(ip: string): Promise<RateLimitResult> {
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
