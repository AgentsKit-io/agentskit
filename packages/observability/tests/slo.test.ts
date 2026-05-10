import { describe, expect, it } from 'vitest'
import { sloObserver } from '../src/slo'

function makeNow() {
  let t = 1_000_000
  return {
    advance: (ms: number) => {
      t += ms
    },
    fn: () => t,
  }
}

describe('sloObserver', () => {
  it('records llm latency and reports a snapshot', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn })
    await slo.on({ type: 'llm:start', id: 'a', adapter: 'openai' } as never)
    clock.advance(120)
    await slo.on({ type: 'llm:end', id: 'a', adapter: 'openai', content: 'hi', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } } as never)
    const snap = slo.snapshot()
    expect(snap.total).toBe(1)
    expect(snap.latencyP50Ms).toBe(120)
    expect(snap.successRate).toBe(1)
    slo.stop()
  })

  it('counts tool errors', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn })
    await slo.on({ type: 'tool:start', id: 't1', name: 'search', args: {} } as never)
    clock.advance(50)
    await slo.on({ type: 'error', id: 't1', error: new Error('boom') } as never)
    const snap = slo.snapshot()
    expect(snap.toolErrorRate).toBe(1)
    expect(snap.successRate).toBe(0)
    slo.stop()
  })

  it('emits Prometheus exposition format', () => {
    const slo = sloObserver({ now: () => 1 })
    const text = slo.prometheus()
    expect(text).toContain('agentskit_success_rate')
    expect(text).toContain('agentskit_latency_ms{quantile="0.95"}')
    slo.stop()
  })
})
