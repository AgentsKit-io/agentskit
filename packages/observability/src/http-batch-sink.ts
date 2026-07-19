import { ConfigError, ErrorCodes, type AgentEvent, type Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'

/** Shared lifecycle surface for HTTP sinks and SDK bridges. */
export interface LifecycleObserver extends Observer {
  flush(): Promise<void>
  shutdown(): Promise<void>
}

/** Common batching / retry knobs for the three HTTP log sinks. */
export interface HttpBatchOptions {
  /** Max events per POST. Default 25. Positive integer. */
  batchSize?: number
  /** Hard queue cap; drop oldest when full. Default 1000. Positive integer. */
  maxQueueSize?: number
  /** Periodic drain interval (ms). Default 2000. Finite > 0. */
  flushIntervalMs?: number
  /** Retries after the initial attempt. Default 3. Integer ≥ 0. */
  maxRetries?: number
  /** Base backoff delay (ms); doubled each attempt, capped at 30s, no jitter. Default 100. */
  retryBaseDelayMs?: number
  /** Per-request timeout (ms). Default 10000. Positive integer. */
  requestTimeoutMs?: number
  /** Isolated error sink; throws/rejections never escape the observer. */
  onError?: (error: unknown) => void | Promise<void>
  fetch?: typeof globalThis.fetch
}

export interface HttpBatchSinkParams {
  name: string
  url: string
  headers: Record<string, string>
  toPayload: (span: TraceSpan, isEnd: boolean) => unknown
  options: HttpBatchOptions
}

const DEFAULT_BATCH_SIZE = 25
const DEFAULT_MAX_QUEUE = 1000
const DEFAULT_FLUSH_INTERVAL_MS = 2000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_BASE_MS = 100
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000
const MAX_BACKOFF_MS = 30_000

export const SNAPSHOT_MAX_DEPTH = 8
export const SNAPSHOT_MAX_KEYS = 40
export const SNAPSHOT_MAX_ARRAY_ITEMS = 40
export const SNAPSHOT_MAX_STRING = 500

function configError(scope: string, name: string, message: string, hint: string): never {
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message: `${scope}: ${message}`,
    hint,
  })
}

function assertPosInt(scope: string, name: string, value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    configError(scope, name, `${name} must be a finite positive integer (received ${String(value)})`, `Pass a positive whole number for ${name}.`)
  }
}

function assertNonNegInt(scope: string, name: string, value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    configError(scope, name, `${name} must be a finite integer ≥ 0 (received ${String(value)})`, `Pass a non-negative whole number for ${name} (0 disables retries).`)
  }
}

function assertPosFinite(scope: string, name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    configError(scope, name, `${name} must be a finite positive number (received ${String(value)})`, `Pass a finite value > 0 for ${name}.`)
  }
}

/** Validate shared batch options. Throws ConfigError (AK_CONFIG_INVALID). */
export function validateHttpBatchOptions(scope: string, options: HttpBatchOptions): void {
  if (options.batchSize !== undefined) assertPosInt(scope, 'batchSize', options.batchSize)
  if (options.maxQueueSize !== undefined) assertPosInt(scope, 'maxQueueSize', options.maxQueueSize)
  if (options.flushIntervalMs !== undefined) assertPosFinite(scope, 'flushIntervalMs', options.flushIntervalMs)
  if (options.maxRetries !== undefined) assertNonNegInt(scope, 'maxRetries', options.maxRetries)
  if (options.retryBaseDelayMs !== undefined) assertPosFinite(scope, 'retryBaseDelayMs', options.retryBaseDelayMs)
  if (options.requestTimeoutMs !== undefined) assertPosInt(scope, 'requestTimeoutMs', options.requestTimeoutMs)
}

function emitError(onError: ((error: unknown) => void | Promise<void>) | undefined, error: unknown): void {
  if (!onError) return
  try {
    const result = onError(error)
    if (result != null && typeof (result as Promise<void>).then === 'function') {
      void Promise.resolve(result).catch(() => {})
    }
  } catch {
    // isolate
  }
}

function unrefTimer(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
  const t = timer as { unref?: () => void }
  if (typeof t.unref === 'function') t.unref()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    unrefTimer(setTimeout(resolve, ms))
  })
}

/** Exponential backoff with hard cap; never overflows Number. */
export function computeBackoffMs(baseMs: number, attempt: number): number {
  if (attempt <= 0) return Math.min(baseMs, MAX_BACKOFF_MS)
  let value = baseMs
  for (let i = 0; i < attempt; i++) {
    if (value >= MAX_BACKOFF_MS / 2) return MAX_BACKOFF_MS
    value *= 2
  }
  return value > MAX_BACKOFF_MS ? MAX_BACKOFF_MS : value
}

function scalarSnap(v: unknown): unknown {
  if (v === null || typeof v === 'boolean') return v
  if (typeof v === 'string') return v.length > SNAPSHOT_MAX_STRING ? v.slice(0, SNAPSHOT_MAX_STRING) : v
  if (typeof v === 'number') return Number.isFinite(v) ? v : String(v)
  if (typeof v === 'bigint') return v.toString()
  if (typeof v === 'undefined') return undefined
  if (typeof v !== 'object') {
    const s = String(v)
    return s.length > SNAPSHOT_MAX_STRING ? s.slice(0, SNAPSHOT_MAX_STRING) : s
  }
  return null
}

/** Bounded deep snapshot. Circular/BigInt-safe; depth/keys/array/string caps. Never throws. */
export function snapshotValue(value: unknown): unknown {
  try {
    const leaf = scalarSnap(value)
    if (leaf !== null || value === null || typeof value !== 'object') return leaf
    const seen = new WeakSet<object>()
    const walk = (v: unknown, d: number): unknown => {
      const s = scalarSnap(v)
      if (s !== null || v === null || typeof v !== 'object') return s
      if (d >= SNAPSHOT_MAX_DEPTH) return '[MaxDepth]'
      if (seen.has(v as object)) return '[Circular]'
      seen.add(v as object)
      if (Array.isArray(v)) {
        const out: unknown[] = []
        const n = Math.min(v.length, SNAPSHOT_MAX_ARRAY_ITEMS)
        for (let i = 0; i < n; i++) out.push(walk(v[i], d + 1))
        if (v.length > SNAPSHOT_MAX_ARRAY_ITEMS) out.push('[Truncated]')
        return out
      }
      const entries = Object.entries(v as Record<string, unknown>)
      const out: Record<string, unknown> = {}
      const n = Math.min(entries.length, SNAPSHOT_MAX_KEYS)
      for (let i = 0; i < n; i++) {
        const [k, child] = entries[i]!
        out[k] = walk(child, d + 1)
      }
      if (entries.length > SNAPSHOT_MAX_KEYS) out['[Truncated]'] = true
      return out
    }
    return walk(value, 0)
  } catch {
    return '[Unserializable]'
  }
}

export function snapshotAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
  const snap = snapshotValue(attributes)
  if (snap && typeof snap === 'object' && !Array.isArray(snap)) return snap as Record<string, unknown>
  return {}
}

async function fetchWithTimeout(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  scope: string,
): Promise<Response> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        controller?.abort()
      } catch {
        // ignore
      }
      reject(new Error(`${scope}: request timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    unrefTimer(timeoutId)
  })
  const fetchPromise = Promise.resolve().then(() =>
    fetchImpl(url, controller ? { ...init, signal: controller.signal } : init),
  )
  // Late settle after timeout must not surface as unhandledRejection.
  void fetchPromise.then(
    () => {},
    () => {},
  )
  try {
    return await Promise.race([fetchPromise, timeoutPromise])
  } finally {
    if (timeoutId != null) clearTimeout(timeoutId)
  }
}

/** Batched HTTP observer: bounded queue, single-flight drain, retries, flush/shutdown. */
export function createHttpBatchSink(params: HttpBatchSinkParams): LifecycleObserver {
  validateHttpBatchOptions(params.name, params.options)
  const batchSize = params.options.batchSize ?? DEFAULT_BATCH_SIZE
  const maxQueueSize = params.options.maxQueueSize ?? DEFAULT_MAX_QUEUE
  const flushIntervalMs = params.options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS
  const maxRetries = params.options.maxRetries ?? DEFAULT_MAX_RETRIES
  const retryBaseDelayMs = params.options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_MS
  const requestTimeoutMs = params.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  const onError = params.options.onError
  const fetchImpl = params.options.fetch ?? globalThis.fetch
  const queue: unknown[] = []
  let acceptingEvents = true
  let shutDown = false
  let shutdownPromise: Promise<void> | null = null
  let activeDrain: Promise<void> | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  const report = (error: unknown): void => emitError(onError, error)

  const enqueue = (item: unknown): void => {
    if (queue.length >= maxQueueSize) {
      queue.shift()
      report(new Error(`${params.name}: queue full (maxQueueSize=${maxQueueSize}); dropped oldest event`))
    }
    queue.push(item)
    if (queue.length >= batchSize) void ensureDrain()
  }

  const postBatch = async (batch: unknown[]): Promise<void> => {
    const body = JSON.stringify(batch)
    let attempt = 0
    for (;;) {
      try {
        let response: Response
        try {
          response = await fetchWithTimeout(
            fetchImpl,
            params.url,
            { method: 'POST', headers: params.headers, body },
            requestTimeoutMs,
            params.name,
          )
        } catch (networkError) {
          if (attempt >= maxRetries) {
            report(networkError)
            return
          }
          await delay(computeBackoffMs(retryBaseDelayMs, attempt))
          attempt += 1
          continue
        }
        if (response.ok) return
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500
        if (!retryable || attempt >= maxRetries) {
          report(new Error(`${params.name}: HTTP ${response.status} delivering ${batch.length} event(s)`))
          return
        }
        await delay(computeBackoffMs(retryBaseDelayMs, attempt))
        attempt += 1
      } catch (error) {
        report(error)
        return
      }
    }
  }

  async function doDrain(): Promise<void> {
    while (queue.length > 0) await postBatch(queue.splice(0, batchSize))
  }

  function ensureDrain(): Promise<void> {
    if (!activeDrain) {
      activeDrain = doDrain().finally(() => {
        activeDrain = null
      })
    }
    return activeDrain
  }

  timer = setInterval(() => {
    if (queue.length > 0) void ensureDrain()
  }, flushIntervalMs)
  unrefTimer(timer)

  const tracker = createTraceTracker({
    onSpanStart(span) {
      try {
        enqueue(params.toPayload(span, false))
      } catch (error) {
        report(error)
      }
    },
    onSpanEnd(span) {
      try {
        enqueue(params.toPayload(span, true))
      } catch (error) {
        report(error)
      }
    },
  })

  async function flush(): Promise<void> {
    if (shutDown) return
    try {
      tracker.flush()
      await ensureDrain()
      if (queue.length > 0) await ensureDrain()
    } catch (error) {
      report(error)
    }
  }

  async function shutdown(): Promise<void> {
    if (shutdownPromise) return shutdownPromise
    acceptingEvents = false
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
    shutdownPromise = (async () => {
      try {
        await flush()
      } catch (error) {
        report(error)
      } finally {
        shutDown = true
      }
    })()
    return shutdownPromise
  }

  return {
    name: params.name,
    on(event: AgentEvent) {
      if (!acceptingEvents || shutDown) return
      try {
        tracker.handle(event)
      } catch (error) {
        report(error)
      }
    },
    flush,
    shutdown,
  }
}
