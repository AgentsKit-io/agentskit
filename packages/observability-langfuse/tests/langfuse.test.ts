import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface CapturedSpan {
  kind: 'span' | 'generation'
  params: Record<string, unknown>
  ended: Record<string, unknown> | null
  parentKind: 'trace' | 'span' | 'generation'
}

interface Captured {
  traces: Array<Record<string, unknown>>
  spans: CapturedSpan[]
  flushAsyncCalls: number
  shutdownAsyncCalls: number
  ctorCalls: number
  lastCtorConfig: Record<string, unknown> | null
  importCount: number
}

let captured: Captured
let parentDelayMs = 0
let failTrace = false
let failFlush = false
let failShutdown = false
let failSpanEnd = false

class FakeSpan {
  ended: Record<string, unknown> | null = null
  constructor(
    public kind: 'span' | 'generation',
    public params: Record<string, unknown>,
    private store: CapturedSpan[],
    private parentKind: 'trace' | 'span' | 'generation',
  ) {
    const rec: CapturedSpan = { kind, params, ended: null, parentKind }
    store.push(rec)
    Object.defineProperty(this, '_rec', { value: rec, enumerable: false })
  }
  get id() {
    return String(this.params.id ?? 'auto')
  }
  end(p: Record<string, unknown> = {}) {
    if (failSpanEnd) throw new Error('span.end boom')
    ;(this as unknown as { _rec: CapturedSpan })._rec.ended = p
    return this
  }
  update() {
    return this
  }
  span(p: Record<string, unknown>) {
    return new FakeSpan('span', p, this.store, this.kind)
  }
  generation(p: Record<string, unknown>) {
    return new FakeSpan('generation', p, this.store, this.kind)
  }
}

class FakeTrace {
  constructor(public params: Record<string, unknown>, private store: Captured) {
    store.traces.push(params)
  }
  get id() {
    return String(this.params.name ?? 'trace')
  }
  update() {
    return this
  }
  span(p: Record<string, unknown>) {
    return new FakeSpan('span', p, this.store.spans, 'trace')
  }
  generation(p: Record<string, unknown>) {
    return new FakeSpan('generation', p, this.store.spans, 'trace')
  }
  event(p: Record<string, unknown>) {
    return p
  }
}

class FakeLangfuse {
  constructor(cfg: Record<string, unknown>) {
    captured.ctorCalls += 1
    captured.lastCtorConfig = cfg
  }
  trace(p: Record<string, unknown>) {
    if (failTrace) throw new Error('langfuse down')
    if (parentDelayMs > 0) {
      // Synchronous construction still; delay is applied in async path via start hooks.
    }
    return new FakeTrace(p, captured)
  }
  async flushAsync() {
    captured.flushAsyncCalls += 1
    if (failFlush) throw new Error('flush boom')
  }
  async shutdownAsync() {
    captured.shutdownAsyncCalls += 1
    if (failShutdown) throw new Error('shutdown boom')
  }
}

beforeEach(() => {
  captured = {
    traces: [],
    spans: [],
    flushAsyncCalls: 0,
    shutdownAsyncCalls: 0,
    ctorCalls: 0,
    lastCtorConfig: null,
    importCount: 0,
  }
  parentDelayMs = 0
  failTrace = false
  failFlush = false
  failShutdown = false
  failSpanEnd = false
  vi.doMock('langfuse', () => {
    captured.importCount += 1
    return { Langfuse: FakeLangfuse }
  })
})

afterEach(() => {
  vi.doUnmock('langfuse')
  vi.resetModules()
})

const settle = () => new Promise(r => setTimeout(r, 15))

describe('langfuse observer', () => {
  it('exposes Observer + flush/shutdown and keeps factory compatible', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    expect(sink.name).toBe('langfuse')
    expect(typeof sink.on).toBe('function')
    expect(typeof sink.flush).toBe('function')
    expect(typeof sink.shutdown).toBe('function')
    await expect(sink.flush()).resolves.toBeUndefined()
    await expect(sink.shutdown()).resolves.toBeUndefined()
  })

  it('does not import the SDK on construction or flush with zero events', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    expect(captured.importCount).toBe(0)
    expect(captured.ctorCalls).toBe(0)
    await sink.flush()
    expect(captured.importCount).toBe(0)
    expect(captured.flushAsyncCalls).toBe(0)
  })

  it('opens a generation for llm spans on the first run', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'plan' })
    sink.on({ type: 'llm:start', model: 'gpt-4o', messageCount: 3 })
    sink.on({
      type: 'llm:end',
      content: 'hi',
      usage: { promptTokens: 10, completionTokens: 5 },
      durationMs: 12,
    })
    await sink.flush()
    expect(captured.traces.length).toBe(1)
    const llmSpan = captured.spans.find(s => s.kind === 'generation')
    expect(llmSpan).toBeDefined()
    expect(llmSpan!.params.model).toBe('gpt-4o')
    expect(llmSpan!.ended).not.toBeNull()
    expect((llmSpan!.ended as { usage?: { input?: number } }).usage?.input).toBe(10)
  })

  it('creates one trace per run inferred only by agent:step step 1', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })

    sink.on({ type: 'agent:step', step: 1, action: 'run-a' })
    sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
    sink.on({ type: 'llm:end', content: 'a', durationMs: 1 })
    sink.on({ type: 'agent:step', step: 2, action: 'continue' })
    sink.on({ type: 'tool:start', name: 't', args: {} })
    sink.on({ type: 'tool:end', name: 't', result: 'ok', durationMs: 1 })

    sink.on({ type: 'agent:step', step: 1, action: 'run-b' })
    sink.on({ type: 'llm:start', model: 'm2', messageCount: 1 })
    sink.on({ type: 'llm:end', content: 'b', durationMs: 1 })

    await sink.flush()
    expect(captured.traces.length).toBe(2)
  })

  it('flush waits for pending SDK work and closes open spans', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'plan' })
    sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
    // No llm:end — flush must close the open span and step.
    await sink.flush()
    expect(captured.spans.some(s => s.ended !== null)).toBe(true)
    expect(captured.flushAsyncCalls).toBeGreaterThanOrEqual(1)
  })

  it('shutdown is idempotent and later events are no-ops', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'plan' })
    sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
    await settle()
    const tracesBeforeShutdown = captured.traces.length
    const spansBeforeShutdown = captured.spans.length
    const shuttingDown = sink.shutdown()
    sink.on({ type: 'llm:end', content: 'during-shutdown', durationMs: 1 })
    sink.on({ type: 'agent:step', step: 1, action: 'during-shutdown' })
    await shuttingDown
    expect(captured.traces.length).toBe(tracesBeforeShutdown)
    expect(captured.spans.length).toBe(spansBeforeShutdown)
    const tracesAfter = captured.traces.length
    const spansAfter = captured.spans.length
    const shutdowns = captured.shutdownAsyncCalls
    await sink.shutdown()
    expect(captured.shutdownAsyncCalls).toBe(shutdowns)
    sink.on({ type: 'llm:end', content: 'x', durationMs: 1 })
    sink.on({ type: 'agent:step', step: 1, action: 'again' })
    await settle()
    expect(captured.traces.length).toBe(tracesAfter)
    expect(captured.spans.length).toBe(spansAfter)
  })

  it('isolates SDK failures in handle/flush/shutdown without unhandled rejections', async () => {
    const rejections: unknown[] = []
    const onUnhandled = (reason: unknown) => {
      rejections.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    try {
      failTrace = true
      const { langfuse } = await import('../src/langfuse')
      const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
      expect(() => {
        sink.on({ type: 'agent:step', step: 1, action: 'plan' })
        sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
        sink.on({ type: 'llm:end', content: 'x', durationMs: 1 })
      }).not.toThrow()
      await settle()

      vi.resetModules()
      vi.doMock('langfuse', () => {
        captured.importCount += 1
        return { Langfuse: FakeLangfuse }
      })
      failTrace = false
      failFlush = true
      failShutdown = true
      failSpanEnd = true
      const { langfuse: langfuse2 } = await import('../src/langfuse')
      const sink2 = langfuse2({ publicKey: 'pk', secretKey: 'sk' })
      sink2.on({ type: 'agent:step', step: 1, action: 'plan' })
      sink2.on({ type: 'tool:start', name: 't', args: {} })
      sink2.on({ type: 'tool:end', name: 't', result: 'ok', durationMs: 1 })
      await expect(sink2.flush()).resolves.toBeUndefined()
      await expect(sink2.shutdown()).resolves.toBeUndefined()
      await settle()
      expect(rejections).toHaveLength(0)
    } finally {
      process.off('unhandledRejection', onUnhandled)
      failTrace = false
      failFlush = false
      failShutdown = false
      failSpanEnd = false
    }
  })

  it('preserves parent linking when parent remote resolution is slower than child', async () => {
    parentDelayMs = 30
    // Slow parent via deferred span factory on the FakeTrace/FakeSpan
    vi.doMock('langfuse', () => {
      captured.importCount += 1
      class SlowLangfuse extends FakeLangfuse {
        trace(p: Record<string, unknown>) {
          const t = new FakeTrace(p, captured)
          const origSpan = t.span.bind(t)
          const origGen = t.generation.bind(t)
          t.span = (params: Record<string, unknown>) => {
            // First span is the step (parent); delay its availability via wrapping end path is not enough —
            // we delay construction so child's await on parentPromise resolves later.
            const start = Date.now()
            while (Date.now() - start < parentDelayMs) {
              /* intentional busy wait to keep parent promise pending longer */
            }
            return origSpan(params)
          }
          t.generation = (params: Record<string, unknown>) => origGen(params)
          return t
        }
      }
      return { Langfuse: SlowLangfuse }
    })
    vi.resetModules()
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'plan' })
    sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
    sink.on({ type: 'llm:end', content: 'x', durationMs: 1 })
    await sink.flush()
    const step = captured.spans.find(s => String(s.params.name) === 'agentskit.agent.step')
    const llm = captured.spans.find(s => s.kind === 'generation')
    expect(step).toBeDefined()
    expect(llm).toBeDefined()
    // Child must not attach directly to the trace when a parent span exists.
    expect(llm!.parentKind).not.toBe('trace')
  })

  it('cleans span maps after many spans end so state does not leak', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'plan' })
    for (let i = 0; i < 40; i++) {
      sink.on({ type: 'tool:start', name: `t${i}`, args: { i } })
      sink.on({ type: 'tool:end', name: `t${i}`, result: 'ok', durationMs: 1 })
    }
    await sink.flush()
    expect(captured.spans.filter(s => s.ended !== null).length).toBeGreaterThanOrEqual(40)
    // A second flush after everything settled must still be safe (maps emptied).
    await expect(sink.flush()).resolves.toBeUndefined()
  })

  it('run-aborted closes open remote spans', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'plan' })
    sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
    sink.on({ type: 'run-aborted' })
    await sink.flush()
    const open = captured.spans.filter(s => s.ended === null)
    expect(open).toHaveLength(0)
    const errored = captured.spans.filter(
      s => s.ended && (s.ended as { level?: string }).level === 'ERROR',
    )
    expect(errored.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects invalid flushAt / flushInterval with ConfigError', async () => {
    // Import after resetModules so ConfigError identity matches the module under test.
    const core = await import('@agentskit/core')
    const { langfuse } = await import('../src/langfuse')
    for (const flushAt of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      try {
        langfuse({ publicKey: 'pk', secretKey: 'sk', flushAt })
        expect.unreachable(`expected ConfigError for flushAt=${String(flushAt)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(core.ConfigError)
        expect((error as { code: string }).code).toBe(core.ErrorCodes.AK_CONFIG_INVALID)
      }
    }
    for (const flushInterval of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      try {
        langfuse({ publicKey: 'pk', secretKey: 'sk', flushInterval })
        expect.unreachable(`expected ConfigError for flushInterval=${String(flushInterval)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(core.ConfigError)
        expect((error as { code: string }).code).toBe(core.ErrorCodes.AK_CONFIG_INVALID)
      }
    }
    expect(() => langfuse({ publicKey: 'pk', secretKey: 'sk', flushAt: 10, flushInterval: 250 })).not.toThrow()
  })

  it('snapshots tags at construction with safe limited copies', async () => {
    const tags = ['a'.repeat(400), 'b']
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk', tags })
    tags[1] = 'mutated'
    sink.on({ type: 'agent:step', step: 1, action: 'plan' })
    sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
    sink.on({ type: 'llm:end', content: 'x', durationMs: 1 })
    await sink.flush()
    const sent = captured.traces[0]?.tags as string[] | undefined
    expect(sent).toBeDefined()
    expect(sent![1]).toBe('b')
    expect(sent![0]!.length).toBeLessThanOrEqual(200)
  })

  it('creates a regular span for tool calls', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'tool' })
    sink.on({ type: 'tool:start', name: 'search', args: { q: 'x' } })
    sink.on({ type: 'tool:end', name: 'search', result: 'ok', durationMs: 5 })
    await sink.flush()
    const toolSpan = captured.spans.find(s => String(s.params.name).startsWith('agentskit.tool'))
    expect(toolSpan).toBeDefined()
    expect(toolSpan!.kind).toBe('span')
    expect(toolSpan!.ended).not.toBeNull()
  })

  it('marks span as ERROR when status is error', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'tool:start', name: 't', args: {} })
    sink.on({ type: 'error', error: new Error('boom') })
    sink.on({ type: 'tool:end', name: 't', result: '', durationMs: 1 })
    await sink.flush()
    const toolSpan = captured.spans.find(s => s.kind === 'span' && String(s.params.name).includes('tool'))
    expect(toolSpan!.ended).not.toBeNull()
    expect((toolSpan!.ended as { level?: string }).level).toBe('ERROR')
  })

  it('reads config from env when not provided', async () => {
    process.env.LANGFUSE_PUBLIC_KEY = 'envpk'
    process.env.LANGFUSE_SECRET_KEY = 'envsk'
    process.env.LANGFUSE_HOST = 'https://eu.cloud.langfuse.com'
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse()
    expect(sink.name).toBe('langfuse')
    delete process.env.LANGFUSE_PUBLIC_KEY
    delete process.env.LANGFUSE_SECRET_KEY
    delete process.env.LANGFUSE_HOST
  })

  it('does not export internal testables', async () => {
    const mod = await import('../src/langfuse')
    expect('__testables' in mod).toBe(false)
  })
})
