import { afterEach, describe, expect, it, vi } from 'vitest'

// Isolated from langfuse.test.ts on purpose: that file's global beforeEach
// registers vi.doMock('langfuse', { Langfuse: FakeLangfuse }), which races
// the empty mock here non-deterministically.

afterEach(() => {
  vi.doUnmock('langfuse')
  vi.resetModules()
})

const settle = () => new Promise(r => setTimeout(r, 15))

describe('langfuse observer — package missing', () => {
  it('warns at most once and stays silent when the langfuse package exports no client', async () => {
    vi.doMock('langfuse', () => ({}))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })

    expect(() => {
      sink.on({ type: 'agent:step', step: 1, action: 'plan' })
      sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
      sink.on({ type: 'llm:end', content: 'x', durationMs: 1 })
    }).not.toThrow()
    await settle()
    await expect(sink.flush()).resolves.toBeUndefined()

    // Drive more events that would re-attempt remote work — still no throw, one warn.
    expect(() => {
      sink.on({ type: 'agent:step', step: 1, action: 'again' })
      sink.on({ type: 'tool:start', name: 't', args: {} })
      sink.on({ type: 'tool:end', name: 't', result: 'ok', durationMs: 1 })
    }).not.toThrow()
    await settle()
    await expect(sink.flush()).resolves.toBeUndefined()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0] ?? '')).toMatch(/langfuse/i)
    warn.mockRestore()
  })
})
