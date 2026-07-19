import { describe, it, expect, vi } from 'vitest'
import { ConfigError, ErrorCodes, type AgentEvent } from '@agentskit/core'
import { costGuard, priceFor, computeCost, DEFAULT_PRICES } from '../src/cost-guard'

const flush = () => new Promise<void>((r) => setImmediate(r))

async function expectNoUnhandledRejection(fn: () => void | Promise<void>): Promise<void> {
  const rejections: unknown[] = []
  const onUR = (reason: unknown) => {
    rejections.push(reason)
  }
  process.on('unhandledRejection', onUR)
  try {
    await fn()
    await flush()
    await flush()
    expect(rejections).toEqual([])
  } finally {
    process.off('unhandledRejection', onUR)
  }
}

describe('priceFor', () => {
  it('exact model match wins', () => {
    const price = priceFor('gpt-4o-mini')
    expect(price).toEqual(DEFAULT_PRICES['gpt-4o-mini'])
  })

  it('longer prefix wins over shorter (gpt-4o-mini vs gpt-4o)', () => {
    const mini = priceFor('gpt-4o-mini-2024-07-18')
    expect(mini).toEqual(DEFAULT_PRICES['gpt-4o-mini'])
    const big = priceFor('gpt-4o-2024-08-06')
    expect(big).toEqual(DEFAULT_PRICES['gpt-4o'])
  })

  it('is case-insensitive', () => {
    expect(priceFor('GPT-4O-MINI')).toEqual(DEFAULT_PRICES['gpt-4o-mini'])
  })

  it('unknown models return zero-cost', () => {
    const price = priceFor('made-up-model')
    expect(price).toEqual({ input: 0, output: 0 })
  })

  it('undefined model returns zero-cost', () => {
    expect(priceFor(undefined)).toEqual({ input: 0, output: 0 })
  })

  it('respects custom prices override', () => {
    const custom = { 'custom-model': { input: 0.1, output: 0.2 } }
    expect(priceFor('custom-model', custom)).toEqual(custom['custom-model'])
  })
})

describe('computeCost', () => {
  it('computes per-1K cost correctly', () => {
    const cost = computeCost(
      { promptTokens: 1000, completionTokens: 500 },
      { input: 0.01, output: 0.03 },
    )
    expect(cost).toBeCloseTo(0.01 + 0.015, 6)
  })

  it('handles fractional token counts', () => {
    const cost = computeCost(
      { promptTokens: 250, completionTokens: 125 },
      { input: 0.04, output: 0.08 },
    )
    expect(cost).toBeCloseTo(0.01 + 0.01, 6)
  })

  it('zero-price model costs zero', () => {
    const cost = computeCost(
      { promptTokens: 10_000, completionTokens: 10_000 },
      { input: 0, output: 0 },
    )
    expect(cost).toBe(0)
  })
})

function llmEnd(pt: number, ct: number): AgentEvent {
  return {
    type: 'llm:end',
    content: '',
    usage: { promptTokens: pt, completionTokens: ct },
    durationMs: 100,
  }
}

describe('costGuard observer', () => {
  it('accumulates token usage and reports cost', () => {
    const controller = new AbortController()
    const guard = costGuard({ budgetUsd: 10, controller, modelOverride: 'gpt-4o' })

    guard.on(llmEnd(1000, 500))

    expect(guard.promptTokens()).toBe(1000)
    expect(guard.completionTokens()).toBe(500)
    expect(guard.costUsd()).toBeCloseTo(0.0025 + 0.005, 6)
    expect(guard.exceeded()).toBe(false)
    expect(controller.signal.aborted).toBe(false)
  })

  it('aborts when budget is exceeded', () => {
    const controller = new AbortController()
    const onExceeded = vi.fn()
    const guard = costGuard({
      budgetUsd: 0.01,
      controller,
      modelOverride: 'gpt-4o',
      onExceeded,
    })

    // 10K prompt tokens at gpt-4o = 10 * 0.0025 = $0.025 — over $0.01 budget
    guard.on(llmEnd(10_000, 0))

    expect(guard.exceeded()).toBe(true)
    expect(controller.signal.aborted).toBe(true)
    expect(onExceeded).toHaveBeenCalledWith({ costUsd: 0.025, budgetUsd: 0.01 })
  })

  it('calls onCost with budget remaining after every update', () => {
    const controller = new AbortController()
    const onCost = vi.fn()
    const guard = costGuard({
      budgetUsd: 1,
      controller,
      modelOverride: 'gpt-4o',
      onCost,
    })

    guard.on(llmEnd(1000, 0))

    expect(onCost).toHaveBeenCalledTimes(1)
    const [arg] = onCost.mock.calls[0]
    expect(arg.costUsd).toBeCloseTo(0.0025, 6)
    expect(arg.budgetRemainingUsd).toBeCloseTo(0.9975, 6)
  })

  it('uses the model from llm:start when no override is provided', () => {
    const controller = new AbortController()
    const guard = costGuard({ budgetUsd: 10, controller })

    guard.on({ type: 'llm:start', model: 'claude-sonnet-4-6', messageCount: 1 })
    guard.on(llmEnd(1000, 1000))

    const expected = computeCost(
      { promptTokens: 1000, completionTokens: 1000 },
      DEFAULT_PRICES['claude-sonnet-4-6'],
    )
    expect(guard.costUsd()).toBeCloseTo(expected, 6)
  })

  it('only fires onExceeded once even if called again over budget', () => {
    const controller = new AbortController()
    const onExceeded = vi.fn()
    const guard = costGuard({
      budgetUsd: 0.01,
      controller,
      modelOverride: 'gpt-4o',
      onExceeded,
    })

    guard.on(llmEnd(10_000, 0))
    guard.on(llmEnd(10_000, 0))

    expect(onExceeded).toHaveBeenCalledTimes(1)
    expect(guard.exceeded()).toBe(true)
  })

  it('reset() zeros counters and lets the observer guard a fresh run', () => {
    const controller = new AbortController()
    const guard = costGuard({ budgetUsd: 10, controller, modelOverride: 'gpt-4o' })

    guard.on(llmEnd(1000, 500))
    expect(guard.costUsd()).toBeGreaterThan(0)

    guard.reset()
    expect(guard.costUsd()).toBe(0)
    expect(guard.promptTokens()).toBe(0)
    expect(guard.completionTokens()).toBe(0)
    expect(guard.exceeded()).toBe(false)
  })

  it('skips unknown events without crashing', () => {
    const controller = new AbortController()
    const guard = costGuard({ budgetUsd: 10, controller })

    expect(() => {
      guard.on({ type: 'tool:start', name: 'x', args: {} })
      guard.on({ type: 'tool:end', name: 'x', result: '', durationMs: 10 })
      guard.on({ type: 'memory:save', messageCount: 1 })
    }).not.toThrow()
    expect(guard.costUsd()).toBe(0)
  })

  it('ignores llm:end events with no usage data', () => {
    const controller = new AbortController()
    const guard = costGuard({ budgetUsd: 10, controller, modelOverride: 'gpt-4o' })

    guard.on({ type: 'llm:end', content: '', durationMs: 100 })

    expect(guard.promptTokens()).toBe(0)
    expect(guard.costUsd()).toBe(0)
  })

  it('custom prices override defaults', () => {
    const controller = new AbortController()
    const guard = costGuard({
      budgetUsd: 100,
      controller,
      prices: { 'gpt-4o': { input: 1, output: 2 } },
      modelOverride: 'gpt-4o',
    })

    guard.on(llmEnd(1000, 500))

    // 1 * 1 + 0.5 * 2 = 2.0
    expect(guard.costUsd()).toBeCloseTo(2, 6)
  })

  it('mixed-model accounting is incremental per active model (not recomputed with latest price)', () => {
    const controller = new AbortController()
    const guard = costGuard({
      budgetUsd: 100,
      controller,
      prices: {
        cheap: { input: 1, output: 0 },
        expensive: { input: 100, output: 0 },
      },
    })

    guard.on({ type: 'llm:start', model: 'cheap', messageCount: 1 })
    guard.on(llmEnd(1000, 0)) // $1
    guard.on({ type: 'llm:start', model: 'expensive', messageCount: 1 })
    guard.on(llmEnd(1000, 0)) // +$100

    // Incremental: 1 + 100 = 101. Wrong (reprice all): 2000 * 100/1000 = 200.
    expect(guard.promptTokens()).toBe(2000)
    expect(guard.costUsd()).toBeCloseTo(101, 6)
  })

  it('normalizes hostile usage (NaN / Infinity / negative) to zero without poisoning cost/state/JSON', () => {
    const controller = new AbortController()
    const onCost = vi.fn()
    const guard = costGuard({
      budgetUsd: 10,
      controller,
      modelOverride: 'gpt-4o',
      onCost,
      prices: { 'gpt-4o': { input: 1, output: 1 } },
    })

    guard.on(llmEnd(Number.NaN, Number.POSITIVE_INFINITY))
    guard.on(llmEnd(-5, -10))
    expect(guard.promptTokens()).toBe(0)
    expect(guard.completionTokens()).toBe(0)
    expect(guard.costUsd()).toBe(0)
    expect(Number.isFinite(guard.costUsd())).toBe(true)

    guard.on(llmEnd(1000, 0))
    expect(guard.costUsd()).toBeCloseTo(1, 6)
    const payload = onCost.mock.calls.at(-1)![0] as Record<string, number>
    expect(Number.isFinite(payload.costUsd)).toBe(true)
    expect(Number.isFinite(payload.promptTokens)).toBe(true)
    expect(Number.isFinite(payload.completionTokens)).toBe(true)
    expect(Number.isFinite(payload.budgetRemainingUsd)).toBe(true)
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload)
  })

  it('rejects invalid budgetUsd / prices at construction with ConfigError AK_CONFIG_INVALID', () => {
    const controller = new AbortController()
    for (const budgetUsd of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      try {
        costGuard({ budgetUsd, controller })
        expect.unreachable(`expected ConfigError for budgetUsd=${String(budgetUsd)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
    for (const price of [
      { input: -1, output: 0 },
      { input: Number.NaN, output: 0 },
      { input: 0, output: Number.POSITIVE_INFINITY },
    ]) {
      try {
        costGuard({ budgetUsd: 1, controller, prices: { bad: price } })
        expect.unreachable(`expected ConfigError for price=${JSON.stringify(price)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
  })

  it('onCost sync throw does not block exceeded mark or abort; onExceeded is isolated', async () => {
    await expectNoUnhandledRejection(async () => {
      const controller = new AbortController()
      const onExceeded = vi.fn(() => {
        throw new Error('onExceeded boom')
      })
      const errors: unknown[] = []
      const guard = costGuard({
        budgetUsd: 0.01,
        controller,
        modelOverride: 'gpt-4o',
        onCost: () => {
          throw new Error('onCost boom')
        },
        onExceeded,
        onError: (e) => {
          errors.push(e)
        },
      })

      expect(() => guard.on(llmEnd(10_000, 0))).not.toThrow()
      expect(guard.exceeded()).toBe(true)
      expect(controller.signal.aborted).toBe(true)
      expect(onExceeded).toHaveBeenCalledTimes(1)
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('onCost / onExceeded async reject never produces unhandledRejection; abort still fires once', async () => {
    await expectNoUnhandledRejection(async () => {
      const controller = new AbortController()
      const errors: unknown[] = []
      const guard = costGuard({
        budgetUsd: 0.01,
        controller,
        modelOverride: 'gpt-4o',
        onCost: async () => {
          throw new Error('onCost reject')
        },
        onExceeded: async () => {
          throw new Error('onExceeded reject')
        },
        onError: (e) => {
          errors.push(e)
        },
      })

      guard.on(llmEnd(10_000, 0))
      expect(guard.exceeded()).toBe(true)
      expect(controller.signal.aborted).toBe(true)
      await flush()
      await flush()
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('marks exceeded and aborts synchronously before hostile onExceeded runs', () => {
    const controller = new AbortController()
    let sawAbortInsideOnExceeded = false
    let sawExceededInsideOnExceeded = false
    const guard = costGuard({
      budgetUsd: 0.01,
      controller,
      modelOverride: 'gpt-4o',
      onExceeded: () => {
        sawAbortInsideOnExceeded = controller.signal.aborted
        sawExceededInsideOnExceeded = guard.exceeded()
        throw new Error('hostile onExceeded')
      },
    })

    expect(() => guard.on(llmEnd(10_000, 0))).not.toThrow()
    expect(sawExceededInsideOnExceeded).toBe(true)
    expect(sawAbortInsideOnExceeded).toBe(true)
    expect(controller.signal.aborted).toBe(true)
  })

  it('onError itself throwing never escapes observer.on', async () => {
    await expectNoUnhandledRejection(async () => {
      const controller = new AbortController()
      const guard = costGuard({
        budgetUsd: 0.01,
        controller,
        modelOverride: 'gpt-4o',
        onCost: () => {
          throw new Error('onCost')
        },
        onError: () => {
          throw new Error('onError hostile')
        },
      })
      expect(() => guard.on(llmEnd(10_000, 0))).not.toThrow()
      expect(controller.signal.aborted).toBe(true)
    })
  })
})
