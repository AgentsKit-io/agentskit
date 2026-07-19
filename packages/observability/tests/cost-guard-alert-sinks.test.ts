import { describe, expect, it, vi } from 'vitest'
import { ConfigError, ErrorCodes } from '@agentskit/core'
import {
  consoleAlertSink,
  throttle,
  webhookAlertSink,
} from '../src/cost-guard-alert-sinks'
import type { CostAlertEvent } from '../src/cost-guard-advanced-types'

const baseEvent: CostAlertEvent = {
  type: 'cost:exceeded',
  tenant: 't1',
  window: 'perDay',
  at: '2026-01-01T00:00:00.000Z',
  costUsd: 1.5,
  budgetUsd: 1,
  utilization: 1.5,
  threshold: 1,
}

describe('consoleAlertSink', () => {
  it('writes a structured stderr line with type, tenant, window, util, and optional fields', () => {
    const writes: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string) => {
      writes.push(String(chunk))
      return true
    }) as typeof process.stderr.write
    try {
      consoleAlertSink()({
        ...baseEvent,
        reason: 'budget breached',
      })
      consoleAlertSink()({
        type: 'cost:forecast',
        tenant: 't2',
        window: 'perMinute',
        at: '2026-01-01T00:00:00.000Z',
        costUsd: 0.25,
        budgetUsd: 1,
        utilization: 0.25,
      })
    } finally {
      process.stderr.write = original
    }

    expect(writes).toHaveLength(2)
    expect(writes[0]).toContain('[cost:exceeded]')
    expect(writes[0]).toContain('tenant=t1')
    expect(writes[0]).toContain('window=perDay')
    expect(writes[0]).toContain('cost=$1.5000')
    expect(writes[0]).toContain('budget=$1.0000')
    expect(writes[0]).toContain('util=150.0%')
    expect(writes[0]).toContain('threshold=100%')
    expect(writes[0]).toContain('reason="budget breached"')
    expect(writes[1]).toContain('[cost:forecast]')
    expect(writes[1]).not.toContain('threshold=')
    expect(writes[1]).not.toContain('reason=')
  })
})

describe('webhookAlertSink', () => {
  it('POSTs JSON with content-type and optional headers', async () => {
    const captured: Array<{ url: string; init: RequestInit }> = []
    const fakeFetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(url), init: init ?? {} })
      return new Response(null, { status: 204 })
    }) as unknown as typeof fetch

    const sink = webhookAlertSink({
      url: 'https://hooks.example/cost',
      fetch: fakeFetch,
      headers: { authorization: 'Bearer secret' },
    })
    await sink(baseEvent)

    expect(captured).toHaveLength(1)
    expect(captured[0].url).toBe('https://hooks.example/cost')
    expect(captured[0].init.method).toBe('POST')
    const headers = captured[0].init.headers as Record<string, string>
    expect(headers['content-type']).toBe('application/json')
    expect(headers.authorization).toBe('Bearer secret')
    expect(JSON.parse(String(captured[0].init.body))).toEqual(baseEvent)
  })

  it('throws on HTTP !ok responses', async () => {
    const sink = webhookAlertSink({
      url: 'https://hooks.example/cost',
      fetch: (async () => new Response('nope', { status: 503 })) as typeof fetch,
    })
    await expect(sink(baseEvent)).rejects.toThrow(/webhookAlertSink: HTTP 503/)
  })

  it('no-ops when neither injected nor global fetch is available', async () => {
    const g = globalThis as { fetch?: typeof globalThis.fetch }
    const original = g.fetch
    try {
      g.fetch = undefined
      const sink = webhookAlertSink({ url: 'https://hooks.example/cost' })
      await expect(sink(baseEvent)).resolves.toBeUndefined()
    } finally {
      if (original !== undefined) g.fetch = original
      else delete g.fetch
    }
  })
})

describe('throttle', () => {
  it('emits at most once per (type, tenant, window, threshold) within windowMs', async () => {
    let now = 1000
    let count = 0
    const sink = throttle(() => {
      count += 1
    }, 5000, () => now)

    await sink(baseEvent)
    await sink(baseEvent)
    expect(count).toBe(1)

    now += 6000
    await sink(baseEvent)
    expect(count).toBe(2)
  })

  it('treats different tenants, windows, types, and thresholds as independent keys', async () => {
    let count = 0
    const sink = throttle(() => {
      count += 1
    }, 60_000)

    await sink(baseEvent)
    await sink({ ...baseEvent, tenant: 't2' })
    await sink({ ...baseEvent, window: 'perMinute' })
    await sink({ ...baseEvent, type: 'cost:threshold', threshold: 0.5 })
    await sink({ ...baseEvent, threshold: 0.8 })
    expect(count).toBe(5)
  })

  it('awaits async inner sinks', async () => {
    const order: string[] = []
    const sink = throttle(async () => {
      order.push('start')
      await Promise.resolve()
      order.push('end')
    }, 1000, () => 0)

    await sink(baseEvent)
    expect(order).toEqual(['start', 'end'])
  })

  it('rejects non-finite / non-positive windowMs with ConfigError', () => {
    const inner = () => {}
    for (const windowMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      try {
        throttle(inner, windowMs)
        expect.unreachable(`expected ConfigError for windowMs=${String(windowMs)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
  })
})
