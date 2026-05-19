import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface CapturedSpan {
  kind: 'span' | 'generation'
  params: Record<string, unknown>
  ended: Record<string, unknown> | null
}

interface Captured {
  traces: Array<Record<string, unknown>>
  spans: CapturedSpan[]
}

let captured: Captured

class FakeSpan {
  ended: Record<string, unknown> | null = null
  constructor(public kind: 'span' | 'generation', public params: Record<string, unknown>, private store: CapturedSpan[]) {
    const rec: CapturedSpan = { kind, params, ended: null }
    store.push(rec)
    Object.defineProperty(this, '_rec', { value: rec, enumerable: false })
  }
  get id() {
    return String(this.params.id ?? 'auto')
  }
  end(p: Record<string, unknown> = {}) {
    ;(this as unknown as { _rec: CapturedSpan })._rec.ended = p
    return this
  }
  update() {
    return this
  }
  span(p: Record<string, unknown>) {
    return new FakeSpan('span', p, this.store)
  }
  generation(p: Record<string, unknown>) {
    return new FakeSpan('generation', p, this.store)
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
    return new FakeSpan('span', p, this.store.spans)
  }
  generation(p: Record<string, unknown>) {
    return new FakeSpan('generation', p, this.store.spans)
  }
  event(p: Record<string, unknown>) {
    return p
  }
}

class FakeLangfuse {
  constructor(_: Record<string, unknown>) {}
  trace(p: Record<string, unknown>) {
    return new FakeTrace(p, captured)
  }
  async flushAsync() {}
  async shutdownAsync() {}
}

beforeEach(() => {
  captured = { traces: [], spans: [] }
  vi.doMock('langfuse', () => ({ Langfuse: FakeLangfuse }))
})

afterEach(() => {
  vi.doUnmock('langfuse')
  vi.resetModules()
})

const flush = () => new Promise(r => setTimeout(r, 5))

describe('langfuse observer', () => {
  it('exposes the standard observer shape', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    expect(sink.name).toBe('langfuse')
    expect(typeof sink.on).toBe('function')
  })

  it('opens a trace on first event and creates a generation for llm spans', async () => {
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
    await flush()
    expect(captured.traces.length).toBe(1)
    const llmSpan = captured.spans.find(s => s.kind === 'generation')
    expect(llmSpan).toBeDefined()
    expect(llmSpan!.params.model).toBe('gpt-4o')
    expect(llmSpan!.ended).not.toBeNull()
    expect((llmSpan!.ended as { usage?: { input?: number } }).usage?.input).toBe(10)
  })

  it('creates a regular span for tool calls and links via parent', async () => {
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'agent:step', step: 1, action: 'tool' })
    sink.on({ type: 'tool:start', name: 'search', args: { q: 'x' } })
    sink.on({ type: 'tool:end', name: 'search', result: 'ok', durationMs: 5 })
    await flush()
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
    await flush()
    const toolSpan = captured.spans.find(s => s.kind === 'span')
    expect(toolSpan!.ended).not.toBeNull()
    expect((toolSpan!.ended as { level?: string }).level).toBe('ERROR')
  })

  it('swallows SDK errors so the runtime is not interrupted', async () => {
    vi.doMock('langfuse', () => ({
      Langfuse: class Bad {
        constructor(_: unknown) {}
        trace() {
          throw new Error('langfuse down')
        }
        async flushAsync() {}
        async shutdownAsync() {}
      },
    }))
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    expect(() => {
      sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
      sink.on({ type: 'llm:end', content: 'x', durationMs: 1 })
    }).not.toThrow()
    await flush()
  })

  it('does not emit traces and warns when langfuse package is missing', async () => {
    // Drop any module graph carried over from earlier tests so the empty
    // mock below is the one `import('../src/langfuse')` actually resolves —
    // otherwise a cached graph bound to beforeEach's FakeLangfuse leaks in
    // and a trace gets captured (flaky "expected 1 to be +0").
    vi.resetModules()
    // Simulate a missing / broken install: module loads but exports no Langfuse client.
    vi.doMock('langfuse', () => ({}))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })
    sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
    await flush()
    expect(captured.traces.length).toBe(0)
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0] ?? '')).toContain('observability-langfuse')
    warn.mockRestore()
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

  it('exposes test predicates', async () => {
    const { __testables } = await import('../src/langfuse')
    expect(__testables.isLlmSpan('gen_ai.chat')).toBe(true)
    expect(__testables.isLlmSpan('agentskit.tool.x')).toBe(false)
    expect(__testables.isToolSpan('agentskit.tool.search')).toBe(true)
    expect(__testables.isToolSpan('gen_ai.chat')).toBe(false)
  })
})
