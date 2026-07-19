import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigError, ErrorCodes, type AgentEvent } from '@agentskit/core'
import { datadogSink, axiomSink, newRelicSink } from '../src/index'
import type { LifecycleObserver } from '../src/http-batch-sink'

interface Capture {
  url: string
  init: RequestInit
  body: unknown[]
}

type SinkFactory = (opts: Record<string, unknown>) => LifecycleObserver

const providers: Array<{
  name: string
  create: SinkFactory
  base: Record<string, unknown>
  expectedUrl: string | RegExp
  authHeader: { key: string; value: string | RegExp }
}> = [
  {
    name: 'datadog',
    create: (opts) =>
      datadogSink({
        apiKey: 'dd-test',
        service: 'svc',
        env: 'prod',
        ...opts,
      } as Parameters<typeof datadogSink>[0]),
    base: {},
    expectedUrl: /http-intake\.logs\.datadoghq\.com/,
    authHeader: { key: 'dd-api-key', value: 'dd-test' },
  },
  {
    name: 'axiom',
    create: (opts) =>
      axiomSink({
        token: 'xaat-test',
        dataset: 'agentskit',
        service: 'svc',
        ...opts,
      } as Parameters<typeof axiomSink>[0]),
    base: {},
    expectedUrl: 'https://api.axiom.co/v1/datasets/agentskit/ingest',
    authHeader: { key: 'authorization', value: 'Bearer xaat-test' },
  },
  {
    name: 'new-relic',
    create: (opts) =>
      newRelicSink({
        apiKey: 'nrak-test',
        service: 'svc',
        ...opts,
      } as Parameters<typeof newRelicSink>[0]),
    base: {},
    expectedUrl: 'https://log-api.newrelic.com/log/v1',
    authHeader: { key: 'api-key', value: 'nrak-test' },
  },
]

function makeFetch(handler?: (n: number) => Response | Promise<Response> | never): {
  fetch: typeof fetch
  calls: Capture[]
} {
  const calls: Capture[] = []
  let n = 0
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '[]')) as unknown[]
    calls.push({ url: String(input), init: init ?? {}, body })
    n += 1
    if (handler) return handler(n)
    return new Response('{}', { status: 202 })
  }) as unknown as typeof globalThis.fetch
  return { fetch, calls }
}

function llmStart(i = 0): AgentEvent {
  return { type: 'llm:start', model: `m-${i}`, messageCount: 1 }
}

function llmEnd(i = 0): AgentEvent {
  return {
    type: 'llm:end',
    content: `out-${i}`,
    usage: { promptTokens: 1, completionTokens: 1 },
    durationMs: 10,
  }
}

function toolStart(args: Record<string, unknown>): AgentEvent {
  return { type: 'tool:start', name: 'echo', args }
}

function toolEnd(): AgentEvent {
  return { type: 'tool:end', name: 'echo', result: 'ok', durationMs: 1 }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe.each(providers)('$name HTTP sink', (provider) => {
  it('batches N events into one request with provider URL/headers', async () => {
    const { fetch, calls } = makeFetch()
    const sink = provider.create({ fetch, batchSize: 4, flushIntervalMs: 60_000 })
    sink.on(llmStart(0))
    sink.on(llmEnd(0))
    sink.on(llmStart(1))
    sink.on(llmEnd(1))
    await vi.waitFor(() => expect(calls.length).toBe(1))
    if (typeof provider.expectedUrl === 'string') {
      expect(calls[0]!.url).toBe(provider.expectedUrl)
    } else {
      expect(calls[0]!.url).toMatch(provider.expectedUrl)
    }
    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers['content-type']).toBe('application/json')
    expect(headers[provider.authHeader.key]).toMatch(provider.authHeader.value)
    expect(calls[0]!.body).toHaveLength(4)
  })

  it('flush sends below batchSize', async () => {
    const { fetch, calls } = makeFetch()
    const sink = provider.create({ fetch, batchSize: 50, flushIntervalMs: 60_000 })
    sink.on(llmStart())
    sink.on(llmEnd())
    expect(calls.length).toBe(0)
    await sink.flush()
    expect(calls.length).toBe(1)
    expect(calls[0]!.body.length).toBeGreaterThanOrEqual(2)
  })

  it('timer flush drains the queue', async () => {
    const { fetch, calls } = makeFetch()
    const sink = provider.create({ fetch, batchSize: 50, flushIntervalMs: 500 })
    sink.on(llmStart())
    sink.on(llmEnd())
    expect(calls.length).toBe(0)
    await vi.advanceTimersByTimeAsync(500)
    await vi.waitFor(() => expect(calls.length).toBe(1))
    await sink.shutdown()
  })

  it('limited queue drops oldest event (proves which left) and reports via onError', async () => {
    const errors: unknown[] = []
    const { fetch, calls } = makeFetch()
    const sink = provider.create({
      fetch,
      batchSize: 100,
      maxQueueSize: 3,
      flushIntervalMs: 250,
      onError: (e) => {
        errors.push(e)
      },
    })
    sink.on(llmStart(0)) // oldest start — should be dropped from the HTTP queue
    sink.on(llmStart(1))
    sink.on(llmStart(2))
    sink.on(llmStart(3)) // drops m-0 start payload
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(String(errors[0])).toMatch(/queue full|dropped oldest/i)
    // Timer drain only (no tracker.flush) so dropped start is not re-created as end.
    await vi.advanceTimersByTimeAsync(250)
    await vi.waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1))
    const raw = JSON.stringify(calls.flatMap((c) => c.body))
    expect(raw).not.toContain('m-0')
    expect(raw).toContain('m-1')
    expect(raw).toContain('m-2')
    expect(raw).toContain('m-3')
    await sink.shutdown()
  })

  it('retries 500 and 429, not 400', async () => {
    {
      const { fetch, calls } = makeFetch((n) =>
        n === 1
          ? new Response('err', { status: 500 })
          : new Response('{}', { status: 202 }),
      )
      const sink = provider.create({
        fetch,
        batchSize: 10,
        flushIntervalMs: 60_000,
        maxRetries: 2,
        retryBaseDelayMs: 10,
      })
      sink.on(llmStart())
      const flushP = sink.flush()
      await vi.advanceTimersByTimeAsync(50)
      await flushP
      expect(calls.length).toBe(2)
      await sink.shutdown()
    }
    {
      const { fetch, calls } = makeFetch((n) =>
        n === 1
          ? new Response('slow', { status: 429 })
          : new Response('{}', { status: 202 }),
      )
      const sink = provider.create({
        fetch,
        batchSize: 10,
        flushIntervalMs: 60_000,
        maxRetries: 2,
        retryBaseDelayMs: 10,
      })
      sink.on(llmStart())
      const flushP = sink.flush()
      await vi.advanceTimersByTimeAsync(50)
      await flushP
      expect(calls.length).toBe(2)
      await sink.shutdown()
    }
    {
      const { fetch, calls } = makeFetch(() => new Response('bad', { status: 400 }))
      const errors: unknown[] = []
      const sink = provider.create({
        fetch,
        batchSize: 10,
        flushIntervalMs: 60_000,
        maxRetries: 5,
        retryBaseDelayMs: 10,
        onError: (e) => {
          errors.push(e)
        },
      })
      sink.on(llmStart())
      await sink.flush()
      expect(calls.length).toBe(1)
      expect(errors.length).toBe(1)
      await sink.shutdown()
    }
  })

  it('retries network rejection then succeeds', async () => {
    let n = 0
    const calls: Capture[] = []
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        init: init ?? {},
        body: JSON.parse(String(init?.body ?? '[]')) as unknown[],
      })
      n += 1
      if (n === 1) throw new Error('network down')
      return new Response('{}', { status: 202 })
    }) as unknown as typeof globalThis.fetch
    const sink = provider.create({
      fetch,
      batchSize: 10,
      flushIntervalMs: 60_000,
      maxRetries: 2,
      retryBaseDelayMs: 10,
    })
    sink.on(llmStart())
    const flushP = sink.flush()
    await vi.advanceTimersByTimeAsync(50)
    await flushP
    expect(calls.length).toBe(2)
    await sink.shutdown()
  })

  it('failed batch is discarded so flush completes (no infinite loop)', async () => {
    const { fetch, calls } = makeFetch(() => new Response('nope', { status: 503 }))
    const errors: unknown[] = []
    const sink = provider.create({
      fetch,
      batchSize: 10,
      flushIntervalMs: 60_000,
      maxRetries: 1,
      retryBaseDelayMs: 5,
      onError: (e) => {
        errors.push(e)
      },
    })
    sink.on(llmStart())
    const flushP = sink.flush()
    await vi.advanceTimersByTimeAsync(100)
    await expect(flushP).resolves.toBeUndefined()
    expect(calls.length).toBe(2) // initial + 1 retry
    expect(errors.length).toBeGreaterThanOrEqual(1)
    await sink.shutdown()
  })

  it('concurrent flush does not duplicate events', async () => {
    const { fetch, calls } = makeFetch()
    const sink = provider.create({ fetch, batchSize: 50, flushIntervalMs: 60_000 })
    sink.on(llmStart(0))
    sink.on(llmEnd(0))
    await Promise.all([sink.flush(), sink.flush(), sink.flush()])
    const total = calls.reduce((n, c) => n + c.body.length, 0)
    // start + end (+ possible step flush closes nothing extra for llm alone)
    // llm start/end without step → 2 events
    expect(total).toBe(2)
  })

  it('payload snapshot ignores later span mutation; circular/BigInt never throw', async () => {
    const { fetch, calls } = makeFetch()
    const sink = provider.create({ fetch, batchSize: 50, flushIntervalMs: 60_000 })
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular
    expect(() => {
      sink.on(toolStart({ circular, big: BigInt(99) }))
      sink.on(toolEnd())
    }).not.toThrow()
    // Real mutation after on: first-token mutates open span attributes post-start snapshot.
    sink.on(llmStart(7))
    sink.on({ type: 'llm:first-token', latencyMs: 4242 })
    await sink.flush()
    expect(calls.length).toBeGreaterThanOrEqual(1)
    const all = calls.flatMap((c) => c.body)
    const startRows = all.filter((row) => {
      const raw = JSON.stringify(row)
      return raw.includes('m-7') && (raw.includes('"phase":"start"') || raw.includes('phase:start'))
    })
    expect(startRows.length).toBeGreaterThanOrEqual(1)
    for (const row of startRows) {
      expect(JSON.stringify(row)).not.toContain('4242')
    }
    const rawAll = JSON.stringify(all)
    expect(rawAll).toContain('[Circular]')
    expect(rawAll).toContain('99')
  })

  it('shutdown is concurrent-safe, idempotent; events after are ignored', async () => {
    const { fetch, calls } = makeFetch()
    const sink = provider.create({ fetch, batchSize: 50, flushIntervalMs: 60_000 })
    sink.on(llmStart())
    await Promise.all([sink.shutdown(), sink.shutdown()])
    const afterShutdown = calls.length
    sink.on(llmStart(9))
    sink.on(llmEnd(9))
    await sink.flush()
    expect(calls.length).toBe(afterShutdown)
  })

  it('shutdown during pending request blocks new events and completes after release', async () => {
    let release!: (r: Response) => void
    const gate = new Promise<Response>((r) => {
      release = r
    })
    const calls: Capture[] = []
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        init: init ?? {},
        body: JSON.parse(String(init?.body ?? '[]')) as unknown[],
      })
      return gate
    }) as unknown as typeof globalThis.fetch
    const sink = provider.create({
      fetch,
      batchSize: 50,
      flushIntervalMs: 60_000,
      requestTimeoutMs: 60_000,
    })
    sink.on(llmStart(1))
    const shutdownP = sink.shutdown()
    await vi.waitFor(() => expect(calls.length).toBe(1))
    // Immediate block: events during pending shutdown are ignored.
    sink.on(llmStart(99))
    sink.on(llmEnd(99))
    release(new Response('{}', { status: 202 }))
    await expect(shutdownP).resolves.toBeUndefined()
    const raw = JSON.stringify(calls.flatMap((c) => c.body))
    expect(raw).toContain('m-1')
    expect(raw).not.toContain('m-99')
  })

  it('hanging fetch times out (maxRetries 0) without unhandledRejection', async () => {
    const unhandled: unknown[] = []
    const onUR = (reason: unknown) => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUR)
    try {
      const errors: unknown[] = []
      let lateResolve!: (r: Response) => void
      const hang = new Promise<Response>((r) => {
        lateResolve = r
      })
      const fetch = vi.fn(async (_u: RequestInfo | URL, _init?: RequestInit) => hang) as unknown as typeof globalThis.fetch
      const sink = provider.create({
        fetch,
        batchSize: 10,
        flushIntervalMs: 60_000,
        maxRetries: 0,
        requestTimeoutMs: 100,
        onError: (e) => {
          errors.push(e)
        },
      })
      sink.on(llmStart())
      const flushP = sink.flush()
      await vi.advanceTimersByTimeAsync(100)
      await expect(flushP).resolves.toBeUndefined()
      expect(errors.some((e) => String(e).includes('timed out'))).toBe(true)
      // Late resolve after timeout must not unhandled-reject.
      lateResolve(new Response('{}', { status: 202 }))
      await Promise.resolve()
      await Promise.resolve()
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUR)
    }
  })

  it('hanging fetch times out then retries once', async () => {
    let n = 0
    const fetch = vi.fn(async () => {
      n += 1
      if (n === 1) return new Promise<Response>(() => {})
      return new Response('{}', { status: 202 })
    }) as unknown as typeof globalThis.fetch
    const sink = provider.create({
      fetch,
      batchSize: 10,
      flushIntervalMs: 60_000,
      maxRetries: 1,
      retryBaseDelayMs: 10,
      requestTimeoutMs: 50,
    })
    sink.on(llmStart())
    const flushP = sink.flush()
    await vi.advanceTimersByTimeAsync(50) // timeout
    await vi.advanceTimersByTimeAsync(20) // backoff
    await expect(flushP).resolves.toBeUndefined()
    expect(n).toBe(2)
  })

  it('rejects invalid config with ConfigError AK_CONFIG_INVALID', () => {
    for (const bad of [
      { batchSize: 0 },
      { batchSize: -1 },
      { batchSize: 1.5 },
      { batchSize: Number.NaN },
      { maxQueueSize: 0 },
      { flushIntervalMs: 0 },
      { flushIntervalMs: -5 },
      { maxRetries: -1 },
      { maxRetries: 1.2 },
      { retryBaseDelayMs: 0 },
      { requestTimeoutMs: 0 },
      { requestTimeoutMs: -1 },
      { requestTimeoutMs: 1.5 },
    ]) {
      expect(() => provider.create({ fetch: makeFetch().fetch, ...bad })).toThrow(ConfigError)
      try {
        provider.create({ fetch: makeFetch().fetch, ...bad })
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigError)
        expect((e as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
    expect(() =>
      provider.create({ fetch: makeFetch().fetch, maxRetries: 0, batchSize: 1, requestTimeoutMs: 1000 }),
    ).not.toThrow()
  })

  it('isolates sync throw and async reject from fetch', async () => {
    const errors: unknown[] = []
    const syncThrow = vi.fn(() => {
      throw new Error('sync boom')
    }) as unknown as typeof globalThis.fetch
    const sink1 = provider.create({
      fetch: syncThrow,
      batchSize: 10,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      onError: (e) => {
        errors.push(e)
      },
    })
    sink1.on(llmStart())
    await expect(sink1.flush()).resolves.toBeUndefined()
    expect(errors.length).toBeGreaterThanOrEqual(1)

    const errors2: unknown[] = []
    const asyncReject = vi.fn(async () => {
      throw new Error('async boom')
    }) as unknown as typeof globalThis.fetch
    const sink2 = provider.create({
      fetch: asyncReject,
      batchSize: 10,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      onError: (e) => {
        errors2.push(e)
      },
    })
    sink2.on(llmStart())
    await expect(sink2.flush()).resolves.toBeUndefined()
    expect(errors2.length).toBeGreaterThanOrEqual(1)
  })

  it('run-aborted closes open spans and delivers end payloads', async () => {
    const { fetch, calls } = makeFetch()
    const sink = provider.create({ fetch, batchSize: 50, flushIntervalMs: 60_000 })
    sink.on({ type: 'agent:step', step: 1, action: 'go' })
    sink.on(llmStart())
    sink.on({ type: 'run-aborted' })
    await sink.flush()
    const phases = calls.flatMap((c) =>
      c.body.map((row) => {
        const r = row as Record<string, unknown>
        if ('phase' in r) return r.phase
        const tags = String(r.ddtags ?? '')
        if (tags.includes('phase:end')) return 'end'
        if (tags.includes('phase:start')) return 'start'
        return null
      }),
    )
    expect(phases).toContain('end')
  })

  it('produces no unhandledRejection on transport failure', async () => {
    const unhandled: unknown[] = []
    const onUR = (reason: unknown) => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUR)
    try {
      const { fetch } = makeFetch(() => {
        throw new Error('explode')
      })
      const sink = provider.create({
        fetch,
        batchSize: 10,
        flushIntervalMs: 60_000,
        maxRetries: 0,
      })
      sink.on(llmStart())
      await sink.flush()
      await Promise.resolve()
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUR)
    }
  })
})

describe('provider-specific endpoints', () => {
  it('datadog honors site', async () => {
    const { fetch, calls } = makeFetch()
    const sink = datadogSink({ apiKey: 'k', site: 'datadoghq.eu', fetch, batchSize: 1 })
    sink.on(llmStart())
    await sink.flush()
    expect(calls[0]!.url).toContain('http-intake.logs.datadoghq.eu')
  })

  it('axiom honors custom endpoint', async () => {
    const { fetch, calls } = makeFetch()
    const sink = axiomSink({
      token: 't',
      dataset: 'd',
      endpoint: 'https://api.eu.axiom.co',
      fetch,
      batchSize: 1,
    })
    sink.on(llmStart())
    await sink.flush()
    expect(calls[0]!.url).toBe('https://api.eu.axiom.co/v1/datasets/d/ingest')
  })

  it('new-relic routes EU region', async () => {
    const { fetch, calls } = makeFetch()
    const sink = newRelicSink({ apiKey: 'k', region: 'EU', fetch, batchSize: 1 })
    sink.on(llmStart())
    await sink.flush()
    expect(calls[0]!.url).toBe('https://log-api.eu.newrelic.com/log/v1')
  })
})

describe('http-batch helpers', () => {
  it('computeBackoffMs caps at 30000 without overflow', async () => {
    const { computeBackoffMs } = await import('../src/http-batch-sink')
    expect(computeBackoffMs(100, 0)).toBe(100)
    expect(computeBackoffMs(100, 1)).toBe(200)
    expect(computeBackoffMs(100, 8)).toBe(25_600)
    expect(computeBackoffMs(100, 9)).toBe(30_000)
    expect(computeBackoffMs(100, 50)).toBe(30_000)
    expect(computeBackoffMs(20_000, 1)).toBe(30_000)
    expect(computeBackoffMs(1e15, 10)).toBe(30_000)
    expect(Number.isFinite(computeBackoffMs(1e300, 100))).toBe(true)
  })

  it('snapshotValue bounds depth, keys, array items, and string length', async () => {
    const {
      snapshotValue,
      SNAPSHOT_MAX_DEPTH,
      SNAPSHOT_MAX_KEYS,
      SNAPSHOT_MAX_ARRAY_ITEMS,
      SNAPSHOT_MAX_STRING,
    } = await import('../src/http-batch-sink')

    let deep: unknown = 'leaf'
    for (let i = 0; i < SNAPSHOT_MAX_DEPTH + 5; i++) deep = { nested: deep }
    const deepSnap = snapshotValue(deep) as Record<string, unknown>
    expect(JSON.stringify(deepSnap)).toContain('[MaxDepth]')

    const manyKeys: Record<string, unknown> = {}
    for (let i = 0; i < SNAPSHOT_MAX_KEYS + 20; i++) manyKeys[`k${i}`] = i
    const keySnap = snapshotValue(manyKeys) as Record<string, unknown>
    expect(Object.keys(keySnap).filter((k) => k !== '[Truncated]').length).toBe(SNAPSHOT_MAX_KEYS)
    expect(keySnap['[Truncated]']).toBe(true)

    const arr = Array.from({ length: SNAPSHOT_MAX_ARRAY_ITEMS + 10 }, (_, i) => i)
    const arrSnap = snapshotValue(arr) as unknown[]
    expect(arrSnap.length).toBe(SNAPSHOT_MAX_ARRAY_ITEMS + 1)
    expect(arrSnap[arrSnap.length - 1]).toBe('[Truncated]')

    const long = 'x'.repeat(SNAPSHOT_MAX_STRING + 100)
    expect(snapshotValue(long)).toBe('x'.repeat(SNAPSHOT_MAX_STRING))

    const circular: Record<string, unknown> = { n: BigInt(7) }
    circular.self = circular
    const circ = snapshotValue(circular) as Record<string, unknown>
    expect(circ.n).toBe('7')
    expect(circ.self).toBe('[Circular]')
  })
})
