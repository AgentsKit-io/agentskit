import { describe, expect, it, vi } from 'vitest'
import { runBraintrustEval, scoreCase, summarize } from '../src/runner'
import { taskSuccess, schemaSurvival } from '../src/scorers'
import type { Scorer } from '../src/types'

describe('scoreCase', () => {
  it('runs all scorers and surfaces errors as scorer_error', async () => {
    const broken = () => {
      throw new Error('boom')
    }
    const r = await scoreCase([taskSuccess, broken as never], {
      input: 'q',
      output: 'Paris',
      expected: 'Paris',
    })
    expect(r).toHaveLength(2)
    expect(r[0]?.name).toBe('task_success')
    expect(r[1]?.name).toBe('scorer_error')
    expect(r[1]?.score).toBe(0)
    expect(r[1]?.metadata?.scorerIndex).toBe(1)
  })

  it('isolates scorers: one throw does not stop siblings', async () => {
    const a: Scorer = () => {
      throw new Error('a failed')
    }
    const b: Scorer = () => ({ name: 'b', score: 1 })
    const c: Scorer = () => {
      throw new Error('c failed')
    }
    const r = await scoreCase([a, b, c], { input: 'q', output: 'x' })
    expect(r.map(s => s.name)).toEqual(['scorer_error', 'b', 'scorer_error'])
    expect(r[1]?.score).toBe(1)
  })

  it('coerces invalid results (NaN, out-of-range, empty name, non-object) to scorer_error', async () => {
    const badScore: Scorer = () => ({ name: 'bad', score: Number.NaN })
    const outOfRange: Scorer = () => ({ name: 'oor', score: 1.5 })
    const emptyName: Scorer = () => ({ name: '  ', score: 1 })
    const notObj: Scorer = () => 'nope' as never
    const nullish: Scorer = () => null as never
    const r = await scoreCase([badScore, outOfRange, emptyName, notObj, nullish], {
      input: 'q',
      output: 'x',
    })
    expect(r).toHaveLength(5)
    for (const s of r) {
      expect(s.name).toBe('scorer_error')
      expect(s.score).toBe(0)
      expect(s.rationale).toMatch(/invalid scorer result/)
      expect(typeof s.metadata?.scorerIndex).toBe('number')
    }
  })
})

describe('summarize', () => {
  it('averages scores by name', () => {
    const s = summarize([
      {
        input: 'a',
        output: 'a',
        scores: [{ name: 'x', score: 1 }, { name: 'y', score: 0 }],
      },
      {
        input: 'b',
        output: 'b',
        scores: [{ name: 'x', score: 0 }, { name: 'y', score: 1 }],
      },
    ])
    expect(s.x?.mean).toBe(0.5)
    expect(s.y?.mean).toBe(0.5)
    expect(s.x?.n).toBe(2)
  })

  it('rejects invalid scorer values passed directly', () => {
    expect(() =>
      summarize([
        {
          input: 'q',
          output: 'a',
          scores: [{ name: 'bad', score: Number.NaN }],
        },
      ]),
    ).toThrow(/invalid scorer result/)
  })

  it('returns 0 for empty input', () => {
    expect(summarize([])).toEqual({})
  })
})

describe('runBraintrustEval', () => {
  it('runs cases through the agent and scorers without a Braintrust SDK', async () => {
    const agent = vi.fn(async (input: string) => ({ output: `${input} → answer` }))
    const result = await runBraintrustEval({
      cases: [
        { input: 'q1', output: '', expected: 'answer' },
        { input: 'q2', output: '', expected: 'answer' },
      ],
      agent,
      scorers: [taskSuccess, schemaSurvival],
      options: { projectName: 'agentskit-test' },
    }, {
      bt: {
        async init() {
          throw new Error('skip')
        },
      },
    })
    expect(result.cases).toHaveLength(2)
    expect(result.summary.task_success?.mean).toBe(1)
    expect(agent).toHaveBeenCalledTimes(2)
    expect(result.warnings).toBeUndefined()
  })

  it('does not import or init SDK when apiKey is absent', async () => {
    const init = vi.fn(async () => {
      throw new Error('should not init')
    })
    const result = await runBraintrustEval(
      {
        cases: [{ input: 'q', output: '', expected: 'q' }],
        agent: async input => ({ output: input }),
        scorers: [taskSuccess],
        options: { projectName: 'p' },
      },
      { bt: { init } },
    )
    expect(init).not.toHaveBeenCalled()
    expect(result.cases).toHaveLength(1)
    expect(result.warnings).toBeUndefined()
  })

  it('classifies malformed agent results as local crashes', async () => {
    const result = await runBraintrustEval({
      cases: [{ input: 'q', output: '' }],
      agent: async () => ({ output: 42 } as never),
      scorers: [schemaSurvival],
      options: { projectName: 'p' },
    })
    expect(result.cases[0]?.output).toBe('')
    expect(result.cases[0]?.metadata?.crashed).toBe(true)
    expect(result.cases[0]?.metadata?.primaryError).toMatch(/output must be a string/)
  })

  it('logs to braintrust when an experiment is initialized', async () => {
    const logs: Record<string, unknown>[] = []
    const fakeExperiment = {
      log(p: Record<string, unknown>) {
        logs.push(p)
      },
      async summarize() {
        return { experimentUrl: 'https://braintrust.dev/x' }
      },
    }
    const result = await runBraintrustEval({
      cases: [{ input: 'q', output: '', expected: 'q' }],
      agent: async input => ({ output: input }),
      scorers: [taskSuccess],
      options: { projectName: 'p', apiKey: 'k', experimentName: 'exp' },
    }, { bt: { init: async () => fakeExperiment } })
    expect(logs).toHaveLength(1)
    expect(result.url).toBe('https://braintrust.dev/x')
  })

  it('awaits async log and optional flush before summarize', async () => {
    const order: string[] = []
    const fakeExperiment = {
      log() {
        return new Promise<void>(resolve => {
          setTimeout(() => {
            order.push('log')
            resolve()
          }, 5)
        })
      },
      flush() {
        return new Promise<void>(resolve => {
          setTimeout(() => {
            order.push('flush')
            resolve()
          }, 5)
        })
      },
      async summarize() {
        order.push('summarize')
        return { experimentUrl: 'https://braintrust.dev/y' }
      },
    }
    const result = await runBraintrustEval(
      {
        cases: [{ input: 'q', output: '', expected: 'q' }],
        agent: async input => ({ output: input }),
        scorers: [taskSuccess],
        options: { projectName: 'p', apiKey: 'secret-key' },
      },
      { bt: { init: async () => fakeExperiment } },
    )
    expect(order).toEqual(['log', 'flush', 'summarize'])
    expect(result.url).toBe('https://braintrust.dev/y')
  })

  it('captures async rejections of log/flush/summarize as warnings without losing local scores', async () => {
    const fakeExperiment = {
      log() {
        return Promise.reject(new Error('log boom with secret-key'))
      },
      flush() {
        return Promise.reject(new Error('flush boom'))
      },
      summarize() {
        return Promise.reject(new Error('summarize boom'))
      },
    }
    const result = await runBraintrustEval(
      {
        cases: [{ input: 'q', output: '', expected: 'q' }],
        agent: async input => ({ output: input }),
        scorers: [taskSuccess],
        options: { projectName: 'p', apiKey: 'secret-key-value' },
      },
      { bt: { init: async () => fakeExperiment } },
    )
    expect(result.cases).toHaveLength(1)
    expect(result.summary.task_success?.mean).toBe(1)
    expect(result.warnings).toEqual([
      'braintrust: log failed',
      'braintrust: flush failed',
      'braintrust: summarize failed',
    ])
    const joined = (result.warnings ?? []).join(' ')
    expect(joined).not.toContain('secret-key')
  })

  it('deduplicates repeated SDK warnings across cases', async () => {
    const result = await runBraintrustEval(
      {
        cases: [
          { input: 'a', output: '' },
          { input: 'b', output: '' },
        ],
        agent: async input => ({ output: input }),
        scorers: [],
        options: { projectName: 'p', apiKey: 'k' },
      },
      {
        bt: {
          init: async () => ({
            log: async () => {
              throw new Error('down')
            },
          }),
        },
      },
    )
    expect(result.warnings).toEqual(['braintrust: log failed'])
  })

  it('records init failure as warning and still returns local results', async () => {
    const result = await runBraintrustEval(
      {
        cases: [{ input: 'q', output: '', expected: 'q' }],
        agent: async input => ({ output: input }),
        scorers: [taskSuccess],
        options: { projectName: 'p', apiKey: 'k' },
      },
      {
        bt: {
          async init() {
            throw new Error('init down')
          },
        },
      },
    )
    expect(result.cases[0]?.scores[0]?.name).toBe('task_success')
    expect(result.warnings).toEqual(['braintrust: init failed'])
  })

  it('records primaryError when the agent throws', async () => {
    const result = await runBraintrustEval(
      {
        cases: [{ input: 'q', output: '' }],
        agent: async () => {
          throw new Error('agent down')
        },
        scorers: [],
        options: { projectName: 'p' },
      },
      {
        bt: {
          async init() {
            throw new Error('skip')
          },
        },
      },
    )
    expect(result.cases[0]?.metadata?.primaryError).toBe('agent down')
    expect(result.cases[0]?.metadata?.crashed).toBe(true)
  })
})
