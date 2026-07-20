import { describe, expect, it } from 'vitest'
import {
  taskSuccess,
  factualGrounding,
  citationCorrectness,
  toolArgValidity,
  schemaSurvival,
  hitlGateCorrectness,
  fallbackResilience,
  noCrashSurvival,
  qualityFamily,
  robustnessFamily,
  ALL_SCORERS,
} from '../src/scorers'

describe('quality scorers', () => {
  it('taskSuccess scores 1 on substring match', async () => {
    const r = await taskSuccess({ input: 'q', output: 'the answer is Paris', expected: 'Paris' })
    expect(r.score).toBe(1)
  })

  it('taskSuccess scores 0 without match', async () => {
    const r = await taskSuccess({ input: 'q', output: 'wrong', expected: 'Paris' })
    expect(r.score).toBe(0)
  })

  it('taskSuccess accepts predicate', async () => {
    const r = await taskSuccess({ input: 'q', output: '42', expected: (o: string) => o === '42' })
    expect(r.score).toBe(1)
  })

  it('taskSuccess accepts regex', async () => {
    const r = await taskSuccess({ input: 'q', output: 'value=42', expected: /value=\d+/ })
    expect(r.score).toBe(1)
  })

  it('taskSuccess reuses global/sticky regex without mutating lastIndex', async () => {
    const globalRe = /value=\d+/g
    const stickyRe = /value=\d+/y
    stickyRe.lastIndex = 0
    globalRe.lastIndex = 0

    const r1 = await taskSuccess({ input: 'q', output: 'value=42', expected: globalRe })
    const r2 = await taskSuccess({ input: 'q', output: 'value=42', expected: globalRe })
    expect(r1.score).toBe(1)
    expect(r2.score).toBe(1)
    expect(globalRe.lastIndex).toBe(0)

    const s1 = await taskSuccess({ input: 'q', output: 'value=7', expected: stickyRe })
    const s2 = await taskSuccess({ input: 'q', output: 'value=7', expected: stickyRe })
    expect(s1.score).toBe(1)
    expect(s2.score).toBe(1)
    expect(stickyRe.lastIndex).toBe(0)

    const offset = /value=\d+/y
    offset.lastIndex = 2
    const offsetResult = await taskSuccess({
      input: 'q',
      output: 'xxvalue=9',
      expected: offset,
    })
    expect(offsetResult.score).toBe(1)
    expect(offset.lastIndex).toBe(2)
  })

  it('taskSuccess returns 0 with no expected', async () => {
    const r = await taskSuccess({ input: 'q', output: 'x' })
    expect(r.score).toBe(0)
  })

  it('factualGrounding ratios sources contained', async () => {
    const r = await factualGrounding({
      input: 'q',
      output: 'mentions Paris and Tokyo',
      metadata: { sources: ['Paris', 'Tokyo', 'Berlin'] },
    })
    expect(r.score).toBeCloseTo(2 / 3)
  })

  it('factualGrounding 0 with no sources', async () => {
    const r = await factualGrounding({ input: 'q', output: 'x' })
    expect(r.score).toBe(0)
  })

  it('citationCorrectness counts citation patterns', async () => {
    const r = await citationCorrectness({
      input: 'q',
      output: 'See [1] and (docs.md) and <source>foo</source>',
    })
    expect(r.score).toBe(1)
  })

  it('citationCorrectness measures expected hit ratio', async () => {
    const r = await citationCorrectness({
      input: 'q',
      output: 'See [1] only',
      metadata: { expectedCitations: ['1', '2'] },
    })
    expect(r.score).toBe(0.5)
  })

  it('toolArgValidity 1 when no tool calls', async () => {
    const r = await toolArgValidity({ input: 'q', output: 'x' })
    expect(r.score).toBe(1)
  })

  it('toolArgValidity ratios valid calls', async () => {
    const r = await toolArgValidity({
      input: 'q',
      output: 'x',
      metadata: {
        toolCalls: [
          { name: 'a', args: {}, schemaValid: true },
          { name: 'b', args: {}, schemaValid: false },
        ],
      },
    })
    expect(r.score).toBe(0.5)
  })
})

describe('robustness scorers', () => {
  it('schemaSurvival 1 when no parse error', async () => {
    const r = await schemaSurvival({ input: 'q', output: 'x' })
    expect(r.score).toBe(1)
  })

  it('schemaSurvival 0 on parse error', async () => {
    const r = await schemaSurvival({
      input: 'q',
      output: 'x',
      metadata: { parseError: 'bad json' },
    })
    expect(r.score).toBe(0)
  })

  it('hitlGateCorrectness rewards expected match', async () => {
    expect(
      (await hitlGateCorrectness({
        input: 'q',
        output: 'x',
        metadata: { hitlExpected: true, hitlTriggered: true },
      })).score,
    ).toBe(1)
    expect(
      (await hitlGateCorrectness({
        input: 'q',
        output: 'x',
        metadata: { hitlExpected: false, hitlTriggered: true },
      })).score,
    ).toBe(0)
  })

  it('fallbackResilience: clean run', async () => {
    expect((await fallbackResilience({ input: 'q', output: 'x' })).score).toBe(1)
  })

  it('fallbackResilience: error recovered', async () => {
    expect(
      (await fallbackResilience({
        input: 'q',
        output: 'x',
        metadata: { primaryError: 'x', fallbackFired: true },
      })).score,
    ).toBe(1)
  })

  it('fallbackResilience: error without fallback', async () => {
    expect(
      (await fallbackResilience({
        input: 'q',
        output: '',
        metadata: { primaryError: 'x', fallbackFired: false },
      })).score,
    ).toBe(0)
  })

  it('fallbackResilience: defensive fallback without error scores 1', async () => {
    expect(
      (await fallbackResilience({
        input: 'q',
        output: 'x',
        metadata: { fallbackFired: true },
      })).score,
    ).toBe(1)
  })

  it('noCrashSurvival: 0 when crashed', async () => {
    expect(
      (await noCrashSurvival({
        input: 'q',
        output: '',
        metadata: { crashed: true },
      })).score,
    ).toBe(0)
  })

  it('noCrashSurvival: 0 on uncaughtException', async () => {
    expect(
      (await noCrashSurvival({
        input: 'q',
        output: '',
        metadata: { uncaughtException: 'TypeError' },
      })).score,
    ).toBe(0)
  })
})

describe('families', () => {
  it('exposes 4 quality + 4 robustness scorers (8 total)', () => {
    expect(qualityFamily.scorers).toHaveLength(4)
    expect(robustnessFamily.scorers).toHaveLength(4)
    expect(ALL_SCORERS).toHaveLength(8)
  })
})
