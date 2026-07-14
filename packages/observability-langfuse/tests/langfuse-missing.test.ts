import { afterEach, describe, expect, it, vi } from 'vitest'

// Isolated from langfuse.test.ts on purpose: that file's global beforeEach
// registers vi.doMock('langfuse', { Langfuse: FakeLangfuse }), which races
// the empty mock here non-deterministically (flaky "expected 1 to be +0").
// With no FakeLangfuse anywhere in this file there is no client to capture a
// trace, so the missing/broken-install behaviour is deterministic.

afterEach(() => {
  vi.doUnmock('langfuse')
  vi.resetModules()
})

const flush = () => new Promise(r => setTimeout(r, 5))

describe('langfuse observer — package missing', () => {
  it('warns and stays silent when the langfuse package exports no client', async () => {
    // Module loads but has no `Langfuse` export → treated as missing install.
    vi.doMock('langfuse', () => ({}))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { langfuse } = await import('../src/langfuse')
    const sink = langfuse({ publicKey: 'pk', secretKey: 'sk' })

    expect(() => {
      sink.on({ type: 'llm:start', model: 'm', messageCount: 1 })
      sink.on({ type: 'llm:end', content: 'x', durationMs: 1 })
    }).not.toThrow()
    await flush()

    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0] ?? '')).toContain('observability/langfuse')
    warn.mockRestore()
  })
})
