import { describe, expect, it, vi } from 'vitest'
import { ConfigError, ErrorCodes } from '@agentskit/core'
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
  it('records llm latency from event.durationMs on canonical events', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn })
    await slo.on({ type: 'llm:start', messageCount: 1 })
    clock.advance(999)
    await slo.on({ type: 'llm:end', content: 'hi', durationMs: 120, usage: { promptTokens: 1, completionTokens: 1 } })
    const snap = slo.snapshot()
    expect(snap.total).toBe(1)
    expect(snap.latencyP50Ms).toBe(120)
    expect(snap.successRate).toBe(1)
    slo.stop()
  })

  it('marks the active tool op on error and does not double-count on tool:end', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn })
    await slo.on({ type: 'tool:start', name: 'search', args: {} })
    clock.advance(50)
    await slo.on({ type: 'error', error: new Error('boom') })
    await slo.on({ type: 'tool:end', name: 'search', result: 'Error: boom', durationMs: 50 })
    const snap = slo.snapshot()
    expect(snap.total).toBe(1)
    expect(snap.toolErrorRate).toBe(1)
    expect(snap.successRate).toBe(0)
    slo.stop()
  })

  it('counts first-token latency above threshold as a stall', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn, stallThresholdMs: 100 })
    await slo.on({ type: 'llm:start', messageCount: 1 })
    await slo.on({ type: 'llm:first-token', latencyMs: 250 })
    await slo.on({ type: 'llm:end', content: 'ok', durationMs: 300 })
    expect(slo.snapshot().streamingStallRate).toBe(1)

    await slo.on({ type: 'llm:start', messageCount: 1 })
    await slo.on({ type: 'llm:first-token', latencyMs: 10 })
    await slo.on({ type: 'llm:end', content: 'ok', durationMs: 40 })
    expect(slo.snapshot().streamingStallRate).toBe(0.5)
    slo.stop()
  })

  it('derives stalls and tool errors from the rolling window, not lifetime counters', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn, stallThresholdMs: 50 })

    await slo.on({ type: 'tool:start', name: 'a', args: {} })
    await slo.on({ type: 'error', error: new Error('old') })
    await slo.on({ type: 'tool:end', name: 'a', result: 'err', durationMs: 1 })

    await slo.on({ type: 'llm:start', messageCount: 1 })
    await slo.on({ type: 'llm:first-token', latencyMs: 100 })
    await slo.on({ type: 'llm:end', content: 'stalled', durationMs: 120 })

    clock.advance(10_000)

    await slo.on({ type: 'tool:start', name: 'b', args: {} })
    await slo.on({ type: 'tool:end', name: 'b', result: 'ok', durationMs: 5 })
    await slo.on({ type: 'llm:start', messageCount: 1 })
    await slo.on({ type: 'llm:first-token', latencyMs: 1 })
    await slo.on({ type: 'llm:end', content: 'fresh', durationMs: 10 })

    const snap = slo.snapshot(1_000)
    expect(snap.total).toBe(2)
    expect(snap.toolErrorRate).toBe(0)
    expect(snap.streamingStallRate).toBe(0)
    slo.stop()
  })

  it('run-aborted records active op failure and clears state', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn })
    await slo.on({ type: 'llm:start', messageCount: 2 })
    clock.advance(30)
    await slo.on({ type: 'run-aborted' })
    const snap = slo.snapshot()
    expect(snap.total).toBe(1)
    expect(snap.successRate).toBe(0)

    await slo.on({ type: 'llm:start', messageCount: 1 })
    await slo.on({ type: 'llm:end', content: 'ok', durationMs: 10 })
    expect(slo.snapshot().total).toBe(2)
    expect(slo.snapshot().successRate).toBe(0.5)
    slo.stop()
  })

  it('rejects non-finite or negative numeric options with ConfigError', () => {
    expect(() => sloObserver({ stallThresholdMs: -1 })).toThrow(ConfigError)
    expect(() => sloObserver({ targets: { latencyP95Ms: -5 } })).toThrow(ConfigError)
    expect(() => sloObserver({ targets: { successRate: 1.5 } })).toThrow(ConfigError)
    expect(() => sloObserver({ burnRateWindowsMs: [0] })).toThrow(ConfigError)
    try {
      sloObserver({ stallThresholdMs: Number.NaN })
      expect.unreachable('expected ConfigError')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
    }
  })

  it('rejects an explicitly empty burnRateWindowsMs array with ConfigError', () => {
    try {
      sloObserver({ burnRateWindowsMs: [] })
      expect.unreachable('expected ConfigError')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      expect((error as ConfigError).message).toMatch(/burnRateWindowsMs/)
    }
  })

  it('snapshot rejects nonfinite or nonpositive windowMs with ConfigError', () => {
    const slo = sloObserver({ now: () => 1 })
    for (const windowMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      try {
        slo.snapshot(windowMs)
        expect.unreachable(`expected ConfigError for windowMs=${String(windowMs)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
    slo.stop()
  })

  it('treats successRate target of 1 with any failure as alerting burn using finite utilization/JSON', async () => {
    const alerts: Array<{ utilization: number; reason?: string }> = []
    vi.useFakeTimers()
    const clock = makeNow()
    const slo = sloObserver({
      now: clock.fn,
      targets: { successRate: 1 },
      burnRateWindowsMs: [60_000],
      alert: (event) => {
        alerts.push({ utilization: event.utilization, reason: event.reason })
      },
    })

    await slo.on({ type: 'llm:start', messageCount: 1 })
    await slo.on({ type: 'error', error: new Error('fail') })
    await slo.on({ type: 'llm:end', content: 'x', durationMs: 10 })

    await vi.advanceTimersByTimeAsync(60_000)
    expect(alerts.length).toBeGreaterThanOrEqual(1)
    const utilization = alerts[0]!.utilization
    expect(Number.isFinite(utilization)).toBe(true)
    expect(utilization).toBeGreaterThanOrEqual(1)
    // Alert payloads must stay JSON-safe (no Infinity → null).
    expect(JSON.parse(JSON.stringify({ utilization }))).toEqual({ utilization })
    slo.stop()
    vi.useRealTimers()
  })

  it('end of a different kind fails and clears the previous active before recording the new result', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn })

    // llm still active when a tool:end arrives (malformed / reordered stream).
    await slo.on({ type: 'llm:start', messageCount: 1 })
    clock.advance(25)
    await slo.on({ type: 'tool:end', name: 'search', result: 'ok', durationMs: 5 })

    const snap = slo.snapshot()
    // previous llm recorded as failure + tool end recorded as success
    expect(snap.total).toBe(2)
    expect(snap.successRate).toBe(0.5)
    expect(snap.toolErrorRate).toBe(0)

    // After clear, a normal tool cycle must not inherit the old llm state.
    await slo.on({ type: 'tool:start', name: 'other', args: {} })
    clock.advance(10)
    await slo.on({ type: 'tool:end', name: 'other', result: 'ok', durationMs: 10 })
    const again = slo.snapshot()
    expect(again.total).toBe(3)
    expect(again.successRate).toBeCloseTo(2 / 3)
    slo.stop()
  })

  it('isolates synchronous throws and async rejections from options.alert in checkBurn', async () => {
    vi.useFakeTimers()
    const rejections: unknown[] = []
    const onUnhandled = (reason: unknown) => {
      rejections.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)

    try {
      const clock = makeNow()
      const slo = sloObserver({
        now: clock.fn,
        targets: { successRate: 0.99 },
        burnRateWindowsMs: [60_000],
        alert: () => {
          throw new Error('sync-alert-boom')
        },
      })

      await slo.on({ type: 'llm:start', messageCount: 1 })
      await slo.on({ type: 'error', error: new Error('fail') })
      await slo.on({ type: 'llm:end', content: 'x', durationMs: 10 })

      // Timer callback must not throw (would become a timer exception).
      await vi.advanceTimersByTimeAsync(60_000)
      slo.stop()

      const asyncClock = makeNow()
      const sloAsync = sloObserver({
        now: asyncClock.fn,
        targets: { successRate: 0.99 },
        burnRateWindowsMs: [60_000],
        alert: async () => {
          throw new Error('async-alert-boom')
        },
      })

      await sloAsync.on({ type: 'llm:start', messageCount: 1 })
      await sloAsync.on({ type: 'error', error: new Error('fail') })
      await sloAsync.on({ type: 'llm:end', content: 'x', durationMs: 10 })

      await vi.advanceTimersByTimeAsync(60_000)
      // Drain microtasks so a leaked rejection would surface.
      await Promise.resolve()
      await Promise.resolve()
      sloAsync.stop()

      expect(rejections).toHaveLength(0)
    } finally {
      process.off('unhandledRejection', onUnhandled)
      vi.useRealTimers()
    }
  })

  it('records previous incomplete op as failed when a new start arrives', async () => {
    const clock = makeNow()
    const slo = sloObserver({ now: clock.fn })

    // Canonical malformed sequence: llm:start without end, then tool:start.
    await slo.on({ type: 'llm:start', messageCount: 1 })
    clock.advance(40)
    await slo.on({ type: 'tool:start', name: 'search', args: { q: 'x' } })
    clock.advance(10)
    await slo.on({ type: 'tool:end', name: 'search', result: 'ok', durationMs: 10 })

    const snap = slo.snapshot()
    expect(snap.total).toBe(2)
    expect(snap.successRate).toBe(0.5)
    expect(snap.toolErrorRate).toBe(0)

    // Same-kind replacement: tool:start while previous tool incomplete.
    await slo.on({ type: 'tool:start', name: 'a', args: {} })
    clock.advance(5)
    await slo.on({ type: 'tool:start', name: 'b', args: {} })
    clock.advance(5)
    await slo.on({ type: 'tool:end', name: 'b', result: 'ok', durationMs: 5 })

    const again = slo.snapshot()
    expect(again.total).toBe(4)
    // two failures (orphan llm + orphan tool a) + two successful tools
    expect(again.successRate).toBe(0.5)
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
