export interface RateLimitBucket {
  /** Tokens available per window. */
  capacity: number
  /** Tokens refilled per `windowMs`. */
  refill: number
  /** Refill interval in ms. */
  windowMs: number
}

export interface RateLimitDecision {
  allowed: boolean
  remaining: number
  /** Milliseconds until the next token is available (0 when allowed). */
  retryAfterMs: number
  key: string
  bucket: string
}

export interface RateLimiterOptions<TContext = unknown> {
  /** Extract the key to bucket against — user id, IP, API key, etc. */
  keyOf: (context: TContext) => string
  /** Buckets keyed by name — caller selects via `bucketOf`. */
  buckets: Record<string, RateLimitBucket>
  /** Pick the bucket for a given context. Default: 'default'. */
  bucketOf?: (context: TContext) => string
  /** Clock override for tests. */
  now?: () => number
  /**
   * Maximum distinct (bucket, key) pairs tracked. Oldest-touched entry
   * is evicted on overflow so a flood of unique keys cannot grow the
   * in-memory map without bound. Default 100_000.
   */
  maxEntries?: number
  /**
   * Drop any bucket entry that has been idle (no `check`) for longer
   * than this. Default 1 hour. Idle drop happens lazily on `check`,
   * so there is no background timer.
   */
  ttlMs?: number
}

export interface RateLimiter<TContext = unknown> {
  check: (context: TContext) => RateLimitDecision
  /** Drop bucket state for a specific key (e.g. on logout). */
  reset: (key: string) => void
  /** Current state snapshot — tests + dashboards. */
  inspect: () => Array<{ key: string; bucket: string; tokens: number }>
}

interface BucketState {
  tokens: number
  lastRefillMs: number
  lastTouchMs: number
}

const DEFAULT_MAX_ENTRIES = 100_000
const DEFAULT_TTL_MS = 60 * 60 * 1_000
// Unit separator — invalid in URLs, identifiers, and bucket / actor
// names. Defeats the prior `endsWith('::'+key)` collision when keys
// themselves contained `::`.
const SEP = '\x1f'

/**
 * Token-bucket rate limiter. Per-key state is in-memory — for
 * multi-process deployments, swap in a Redis-backed implementation
 * with the same `RateLimiter` contract.
 *
 * Memory is bounded:
 *  - `maxEntries` caps distinct (bucket, key) pairs; oldest-touch entry
 *    is evicted on overflow so a stream of unique keys can't grow the
 *    map past the cap.
 *  - `ttlMs` drops entries that have been idle longer than the window
 *    lazily on `check`.
 */
export function createRateLimiter<TContext = unknown>(
  options: RateLimiterOptions<TContext>,
): RateLimiter<TContext> {
  const bucketNames = Object.keys(options.buckets)
  if (bucketNames.length === 0) throw new Error('createRateLimiter requires ≥ 1 bucket')
  const pickBucket = options.bucketOf ?? ((): string => 'default')
  const clock = options.now ?? ((): number => Date.now())
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  // Map iteration order is insertion order; we re-insert on touch so
  // the first entry is always the oldest-touched — LRU eviction in O(1).
  const state = new Map<string, BucketState>()

  const refill = (s: BucketState, cfg: RateLimitBucket, now: number): void => {
    const elapsed = now - s.lastRefillMs
    if (elapsed <= 0) return
    const windows = elapsed / cfg.windowMs
    if (windows >= 1) {
      s.tokens = Math.min(cfg.capacity, s.tokens + Math.floor(windows) * cfg.refill)
      s.lastRefillMs += Math.floor(windows) * cfg.windowMs
    }
  }

  const touch = (stateKey: string, s: BucketState, now: number): void => {
    s.lastTouchMs = now
    state.delete(stateKey)
    state.set(stateKey, s)
  }

  const evictExpired = (now: number): void => {
    for (const [k, s] of state) {
      if (now - s.lastTouchMs > ttlMs) {
        state.delete(k)
      } else {
        // Insertion-ordered by lastTouch; first non-expired entry means
        // every entry after it is fresher.
        break
      }
    }
  }

  const evictOverflow = (): void => {
    while (state.size > maxEntries) {
      const oldest = state.keys().next().value
      if (oldest === undefined) break
      state.delete(oldest)
    }
  }

  return {
    check(context) {
      const key = options.keyOf(context)
      const bucketName = pickBucket(context)
      const cfg = options.buckets[bucketName]
      if (!cfg) throw new Error(`unknown rate-limit bucket: ${bucketName}`)
      const stateKey = `${bucketName}${SEP}${key}`
      const now = clock()
      evictExpired(now)

      let s = state.get(stateKey)
      if (!s) {
        s = { tokens: cfg.capacity, lastRefillMs: now, lastTouchMs: now }
        state.set(stateKey, s)
        evictOverflow()
      } else {
        refill(s, cfg, now)
        touch(stateKey, s, now)
      }

      if (s.tokens > 0) {
        s.tokens--
        return { allowed: true, remaining: s.tokens, retryAfterMs: 0, key, bucket: bucketName }
      }
      const msUntilNext = cfg.windowMs - ((now - s.lastRefillMs) % cfg.windowMs)
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: msUntilNext,
        key,
        bucket: bucketName,
      }
    },

    reset(key) {
      const suffix = `${SEP}${key}`
      for (const stateKey of Array.from(state.keys())) {
        if (stateKey.endsWith(suffix)) state.delete(stateKey)
      }
    },

    inspect() {
      return Array.from(state, ([k, s]) => {
        const sepIdx = k.indexOf(SEP)
        const bucket = sepIdx === -1 ? k : k.slice(0, sepIdx)
        const rest = sepIdx === -1 ? '' : k.slice(sepIdx + 1)
        return { bucket, key: rest, tokens: s.tokens }
      })
    },
  }
}
