import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentEvent } from '@agentskit/core'

interface CapturedSpan {
  name: string
  attributes: Record<string, unknown>
  startTime?: number
  endTime?: number
  ended: boolean
  status?: { code: number; message?: string }
  parentSet: boolean
}

let started: CapturedSpan[]
let forceFlushCalls: number
let shutdownCalls: number
let setGlobalCalls: number
let providerConstructedWith: unknown
let startOrder: string[]
let endOrder: string[]
let ownedTracerStarts: number
let globalTracerStarts: number

beforeEach(() => {
  started = []
  forceFlushCalls = 0
  shutdownCalls = 0
  setGlobalCalls = 0
  providerConstructedWith = undefined
  startOrder = []
  endOrder = []
  ownedTracerStarts = 0
  globalTracerStarts = 0
})

afterEach(() => {
  vi.doUnmock('@opentelemetry/api')
  vi.doUnmock('@opentelemetry/sdk-trace-base')
  vi.doUnmock('@opentelemetry/exporter-trace-otlp-http')
  vi.resetModules()
})

function makeSpanFactory(opts?: { failSetAttribute?: boolean; failSetStatus?: boolean; tag?: string }) {
  return (
    name: string,
    options?: { attributes?: Record<string, unknown>; startTime?: number },
    _ctx?: unknown,
  ) => {
    const captured: CapturedSpan = {
      name,
      attributes: { ...(options?.attributes ?? {}) },
      startTime: options?.startTime,
      ended: false,
      parentSet: _ctx != null && typeof _ctx === 'object' && 'parent' in (_ctx as object),
    }
    if (opts?.tag) captured.attributes['__source'] = opts.tag
    started.push(captured)
    startOrder.push(name)
    return {
      setAttribute(k: string, v: unknown) {
        if (opts?.failSetAttribute) throw new Error('setAttribute boom')
        captured.attributes[k] = v
      },
      setStatus(s: { code: number; message?: string }) {
        if (opts?.failSetStatus) throw new Error('setStatus boom')
        captured.status = s
      },
      end(t?: number) {
        captured.endTime = t
        captured.ended = true
        endOrder.push(name)
      },
    }
  }
}

function mockApi(opts?: {
  failSetAttribute?: boolean
  failSetStatus?: boolean
  setGlobalResult?: boolean
  omitSetGlobal?: boolean
  setGlobalThrows?: boolean
}) {
  const activeContext = {}
  vi.doMock('@opentelemetry/api', () => {
    const SpanStatusCode = { OK: 1, ERROR: 2 }
    const trace: Record<string, unknown> = {
      getTracer: () => {
        globalTracerStarts += 1
        return {
          startSpan: makeSpanFactory({
            failSetAttribute: opts?.failSetAttribute,
            failSetStatus: opts?.failSetStatus,
            tag: 'global',
          }),
        }
      },
      setSpan: (_ctx: unknown, _span: unknown) => ({ parent: true }),
    }
    if (!opts?.omitSetGlobal) {
      trace.setGlobalTracerProvider = () => {
        setGlobalCalls += 1
        if (opts?.setGlobalThrows) throw new Error('setGlobal boom')
        return opts?.setGlobalResult ?? true
      }
    }
    return {
      SpanStatusCode,
      context: { active: () => activeContext },
      trace,
    }
  })
}

function mockOwnedSdk() {
  vi.doMock('@opentelemetry/sdk-trace-base', () => ({
    BasicTracerProvider: class {
      constructor(config?: unknown) {
        providerConstructedWith = config
      }
      getTracer() {
        ownedTracerStarts += 1
        return {
          startSpan: makeSpanFactory({ tag: 'owned' }),
        }
      }
      async forceFlush() {
        forceFlushCalls += 1
      }
      async shutdown() {
        shutdownCalls += 1
      }
    },
    BatchSpanProcessor: class {
      constructor(_exporter: unknown) {}
    },
  }))
  vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
    OTLPTraceExporter: class {
      constructor(_c: unknown) {}
    },
  }))
}

function mockSdkMissing() {
  vi.doMock('@opentelemetry/sdk-trace-base', () => {
    throw new Error('no sdk')
  })
  vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => {
    throw new Error('no exporter')
  })
}

const llmStart = (): AgentEvent => ({ type: 'llm:start', model: 'gpt', messageCount: 1 })
const llmEnd = (): AgentEvent => ({
  type: 'llm:end',
  content: 'hi',
  durationMs: 5,
})

describe('opentelemetry observer', () => {
  it('returns Observer with flush/shutdown', async () => {
    mockApi()
    mockSdkMissing()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    expect(sink.name).toBe('opentelemetry')
    expect(typeof sink.flush).toBe('function')
    expect(typeof sink.shutdown).toBe('function')
  })

  it('construction is pure — no import until first event', async () => {
    let apiImported = false
    vi.doMock('@opentelemetry/api', () => {
      apiImported = true
      throw new Error('should not load')
    })
    const { opentelemetry } = await import('../src/opentelemetry')
    opentelemetry()
    expect(apiImported).toBe(false)
  })

  it('zero-event flush does not import SDK', async () => {
    let apiImported = false
    vi.doMock('@opentelemetry/api', () => {
      apiImported = true
      return { SpanStatusCode: {}, context: { active: () => ({}) }, trace: { getTracer: () => ({}) } }
    })
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    await sink.flush()
    expect(apiImported).toBe(false)
  })

  it('setGlobal true: uses global tracer and keeps owned for forceFlush', async () => {
    mockApi({ setGlobalResult: true })
    mockOwnedSdk()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry({ serviceName: 'agentskit-test' })
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    expect(providerConstructedWith).toEqual(
      expect.objectContaining({ spanProcessors: expect.any(Array) }),
    )
    expect(setGlobalCalls).toBe(1)
    expect(forceFlushCalls).toBe(1)
    expect(started.length).toBeGreaterThan(0)
    expect(started.some((s) => s.attributes['__source'] === 'global')).toBe(true)
    expect(started.some((s) => s.ended)).toBe(true)
  })

  it('setGlobal false: shuts down owned and uses global tracer only', async () => {
    mockApi({ setGlobalResult: false })
    mockOwnedSdk()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    expect(setGlobalCalls).toBe(1)
    expect(shutdownCalls).toBe(1)
    expect(forceFlushCalls).toBe(0)
    expect(started.some((s) => s.attributes['__source'] === 'global')).toBe(true)
  })

  it('missing setGlobalTracerProvider uses owned getTracer and keeps ownership', async () => {
    mockApi({ omitSetGlobal: true })
    mockOwnedSdk()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    expect(setGlobalCalls).toBe(0)
    expect(ownedTracerStarts).toBeGreaterThanOrEqual(1)
    expect(started.some((s) => s.attributes['__source'] === 'owned')).toBe(true)
    expect(forceFlushCalls).toBe(1)
    await sink.shutdown()
    expect(shutdownCalls).toBe(1)
  })

  it('setGlobal throw disposes owned provider and falls back to global', async () => {
    const errors: unknown[] = []
    mockApi({ setGlobalThrows: true })
    mockOwnedSdk()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry({
      onError: (e) => {
        errors.push(e)
      },
    })
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    expect(shutdownCalls).toBe(1)
    expect(forceFlushCalls).toBe(0)
    expect(errors.some((e) => String(e).includes('setGlobal boom'))).toBe(true)
    expect(started.some((s) => s.attributes['__source'] === 'global')).toBe(true)
  })

  it('falls back to global provider when SDK missing', async () => {
    mockApi()
    mockSdkMissing()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    expect(started.length).toBeGreaterThan(0)
    expect(forceFlushCalls).toBe(0)
  })

  it('shutdown forceFlushes owned provider once; second shutdown idempotent', async () => {
    mockApi({ setGlobalResult: true })
    mockOwnedSdk()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    sink.on(llmStart())
    sink.on(llmEnd())
    await Promise.all([sink.shutdown(), sink.shutdown()])
    expect(shutdownCalls).toBe(1)
    expect(forceFlushCalls).toBe(1)
    const before = started.length
    sink.on(llmStart())
    await sink.flush()
    expect(started.length).toBe(before)
  })

  it('does not shutdown user global when SDK unavailable', async () => {
    mockApi()
    mockSdkMissing()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    sink.on(llmStart())
    await sink.shutdown()
    expect(shutdownCalls).toBe(0)
  })

  it('orders start before end; parent start before child', async () => {
    mockApi()
    mockSdkMissing()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    sink.on({ type: 'agent:step', step: 1, action: 'a' })
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    const stepIdx = startOrder.indexOf('agentskit.agent.step')
    const llmIdx = startOrder.indexOf('gen_ai.chat')
    expect(stepIdx).toBeGreaterThanOrEqual(0)
    expect(llmIdx).toBeGreaterThan(stepIdx)
    expect(endOrder.indexOf('gen_ai.chat')).toBeGreaterThanOrEqual(0)
  })

  it('ends span even when setAttribute throws; reports error; map cleaned', async () => {
    mockApi({ failSetAttribute: true })
    mockSdkMissing()
    const errors: unknown[] = []
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry({
      onError: (e) => {
        errors.push(e)
      },
    })
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    const llm = started.find((s) => s.name === 'gen_ai.chat')
    expect(llm).toBeDefined()
    expect(llm!.ended).toBe(true)
    expect(errors.some((e) => String(e).includes('setAttribute boom'))).toBe(true)
  })

  it('ends span even when setStatus throws', async () => {
    mockApi({ failSetStatus: true })
    mockSdkMissing()
    const errors: unknown[] = []
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry({
      onError: (e) => {
        errors.push(e)
      },
    })
    sink.on({ type: 'agent:step', step: 1, action: 'a' })
    sink.on(llmStart())
    sink.on({ type: 'error', error: new Error('boom') })
    sink.on(llmEnd())
    await sink.flush()
    const llm = started.find((s) => s.name === 'gen_ai.chat')
    expect(llm?.ended).toBe(true)
    expect(errors.some((e) => String(e).includes('setStatus boom'))).toBe(true)
  })

  it('run-aborted ends open spans', async () => {
    mockApi()
    mockSdkMissing()
    const { opentelemetry } = await import('../src/opentelemetry')
    const sink = opentelemetry()
    sink.on({ type: 'agent:step', step: 1, action: 'a' })
    sink.on(llmStart())
    sink.on({ type: 'run-aborted' })
    await sink.flush()
    expect(started.some((s) => s.ended)).toBe(true)
  })

  it('missing API never throws / unhandledRejection', async () => {
    const unhandled: unknown[] = []
    const onUR = (r: unknown) => unhandled.push(r)
    process.on('unhandledRejection', onUR)
    try {
      vi.doMock('@opentelemetry/api', () => {
        throw new Error('not installed')
      })
      const { opentelemetry } = await import('../src/opentelemetry')
      const sink = opentelemetry()
      expect(() => {
        sink.on(llmStart())
        sink.on(llmEnd())
      }).not.toThrow()
      await expect(sink.flush()).resolves.toBeUndefined()
      await expect(sink.shutdown()).resolves.toBeUndefined()
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUR)
    }
  })
})
