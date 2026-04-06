import { describe, it, expect, vi } from 'vitest'
import { runEval } from '../src/runner'
import type { EvalSuite } from '@agentskit/core'

describe('runEval', () => {
  const simpleSuite: EvalSuite = {
    name: 'basic',
    cases: [
      { input: 'What is 2+2?', expected: '4' },
      { input: 'What color is the sky?', expected: 'blue' },
    ],
  }

  it('runs all test cases and returns EvalResult', async () => {
    const agent = vi.fn()
      .mockResolvedValueOnce('The answer is 4.')
      .mockResolvedValueOnce('The sky is blue.')

    const result = await runEval({ agent, suite: simpleSuite })

    expect(result.totalCases).toBe(2)
    expect(result.passed).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.accuracy).toBe(1.0)
    expect(result.results).toHaveLength(2)
  })

  it('uses includes for string expected', async () => {
    const agent = vi.fn().mockResolvedValue('The answer is definitely 4, no doubt.')

    const result = await runEval({
      agent,
      suite: { name: 'test', cases: [{ input: 'Q', expected: '4' }] },
    })

    expect(result.passed).toBe(1)
  })

  it('marks as failed when expected string not found', async () => {
    const agent = vi.fn().mockResolvedValue('I have no idea')

    const result = await runEval({ agent, suite: simpleSuite })

    expect(result.passed).toBe(0)
    expect(result.failed).toBe(2)
    expect(result.accuracy).toBe(0)
  })

  it('supports function expected', async () => {
    const agent = vi.fn().mockResolvedValue('42')

    const result = await runEval({
      agent,
      suite: {
        name: 'func',
        cases: [
          { input: 'Q', expected: (r: string) => parseInt(r, 10) > 40 },
        ],
      },
    })

    expect(result.passed).toBe(1)
  })

  it('function expected returning false marks failure', async () => {
    const agent = vi.fn().mockResolvedValue('5')

    const result = await runEval({
      agent,
      suite: {
        name: 'func',
        cases: [
          { input: 'Q', expected: (r: string) => parseInt(r, 10) > 40 },
        ],
      },
    })

    expect(result.failed).toBe(1)
  })

  it('records latency per case', async () => {
    const agent = vi.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 10))
      return 'answer'
    })

    const result = await runEval({
      agent,
      suite: { name: 'test', cases: [{ input: 'Q', expected: 'answer' }] },
    })

    expect(result.results[0].latencyMs).toBeGreaterThanOrEqual(5)
  })

  it('handles agent errors — records and continues', async () => {
    const agent = vi.fn()
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce('The sky is blue.')

    const result = await runEval({ agent, suite: simpleSuite })

    expect(result.totalCases).toBe(2)
    expect(result.passed).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.results[0].error).toBe('API timeout')
    expect(result.results[0].passed).toBe(false)
    expect(result.results[1].passed).toBe(true)
  })

  it('supports agent returning object with tokenUsage', async () => {
    const agent = vi.fn().mockResolvedValue({
      content: 'The answer is 4.',
      tokenUsage: { prompt: 100, completion: 20 },
    })

    const result = await runEval({
      agent,
      suite: { name: 'test', cases: [{ input: 'Q', expected: '4' }] },
    })

    expect(result.passed).toBe(1)
    expect(result.results[0].tokenUsage).toEqual({ prompt: 100, completion: 20 })
  })

  it('handles mixed string and object responses', async () => {
    const agent = vi.fn()
      .mockResolvedValueOnce('plain string with 4')
      .mockResolvedValueOnce({ content: 'object with blue', tokenUsage: { prompt: 50, completion: 10 } })

    const result = await runEval({ agent, suite: simpleSuite })

    expect(result.passed).toBe(2)
    expect(result.results[0].tokenUsage).toBeUndefined()
    expect(result.results[1].tokenUsage).toEqual({ prompt: 50, completion: 10 })
  })

  it('calculates accuracy correctly for partial pass', async () => {
    const agent = vi.fn()
      .mockResolvedValueOnce('4')
      .mockResolvedValueOnce('green')

    const result = await runEval({ agent, suite: simpleSuite })

    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.passed).toBe(1)
    expect(result.failed).toBe(1)
  })

  it('handles empty suite', async () => {
    const agent = vi.fn()

    const result = await runEval({
      agent,
      suite: { name: 'empty', cases: [] },
    })

    expect(result.totalCases).toBe(0)
    expect(result.accuracy).toBe(0)
    expect(agent).not.toHaveBeenCalled()
  })

  it('runs cases sequentially', async () => {
    const order: number[] = []
    const agent = vi.fn().mockImplementation(async (input: string) => {
      const idx = parseInt(input, 10)
      order.push(idx)
      await new Promise(r => setTimeout(r, 5))
      return String(idx)
    })

    await runEval({
      agent,
      suite: {
        name: 'order',
        cases: [
          { input: '1', expected: '1' },
          { input: '2', expected: '2' },
          { input: '3', expected: '3' },
        ],
      },
    })

    expect(order).toEqual([1, 2, 3])
  })

  it('EvalResult shape matches core contract', async () => {
    const agent = vi.fn().mockResolvedValue('ok')

    const result = await runEval({
      agent,
      suite: { name: 'shape', cases: [{ input: 'Q', expected: 'ok' }] },
    })

    // Verify all required fields exist
    expect(result).toHaveProperty('totalCases')
    expect(result).toHaveProperty('passed')
    expect(result).toHaveProperty('failed')
    expect(result).toHaveProperty('accuracy')
    expect(result).toHaveProperty('results')
    expect(result.results[0]).toHaveProperty('input')
    expect(result.results[0]).toHaveProperty('output')
    expect(result.results[0]).toHaveProperty('passed')
    expect(result.results[0]).toHaveProperty('latencyMs')
  })
})
