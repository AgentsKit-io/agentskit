import { describe, expect, it } from 'vitest'
import {
  EVAL_FORMAT_VERSION,
  matchesExpectation,
  validateEvalRunResult,
  validateEvalSuite,
} from '../src/eval-format'

describe('validateEvalSuite', () => {
  it('accepts a minimal suite', () => {
    const suite = validateEvalSuite({
      evalFormatVersion: EVAL_FORMAT_VERSION,
      name: 'smoke',
      cases: [{ id: 'c1', input: 'hi' }],
    })
    expect(suite.cases).toHaveLength(1)
  })

  it('preserves valid optional metadata and rejects duplicate ids', () => {
    expect(validateEvalSuite({
      evalFormatVersion: EVAL_FORMAT_VERSION,
      name: 'full', description: 'desc', tags: ['smoke'],
      cases: [{ id: 'c1', input: 'hi', metadata: { owner: 'qa' } }],
    })).toMatchObject({ description: 'desc', tags: ['smoke'] })
    expect(validateEvalSuite({
      evalFormatVersion: EVAL_FORMAT_VERSION, name: 'x', tags: [1], cases: [{ id: 'c1', input: 'x' }],
    }).tags).toBeUndefined()
    expect(() => validateEvalSuite({
      evalFormatVersion: EVAL_FORMAT_VERSION, name: 'x', cases: [{ id: 'c1', input: 'x' }, { id: 'c1', input: 'y' }],
    })).toThrow(/unique/)
  })

  it('rejects missing + malformed fields', () => {
    expect(() => validateEvalSuite({})).toThrow(/evalFormatVersion/)
    expect(() =>
      validateEvalSuite({ evalFormatVersion: EVAL_FORMAT_VERSION, name: 'x', cases: 'no' }),
    ).toThrow(/cases must be array/)
    expect(() =>
      validateEvalSuite({ evalFormatVersion: EVAL_FORMAT_VERSION, name: 'x', cases: [{ id: 'c' }] }),
    ).toThrow(/cases\[0\]\.input required/)
  })
})

describe('validateEvalRunResult', () => {
  it('accepts a run-result payload', () => {
    validateEvalRunResult({
      evalFormatVersion: EVAL_FORMAT_VERSION,
      suite: 'smoke',
      startedAt: 'a',
      completedAt: 'b',
      agent: {},
      totals: { cases: 1, passed: 1, failed: 0, accuracy: 1 },
      cases: [{ id: 'c1', input: 'hi', output: 'hello', passed: true, latencyMs: 1 }],
    })
  })

  it('rejects empty runs and malformed case records', () => {
    expect(() => validateEvalRunResult({
      evalFormatVersion: EVAL_FORMAT_VERSION,
      suite: 'smoke', startedAt: 'a', completedAt: 'b', agent: {},
      totals: { cases: 0, passed: 0, failed: 0, accuracy: 0 }, cases: [],
    })).toThrow(/greater than zero/)
    expect(() => validateEvalRunResult({
      evalFormatVersion: EVAL_FORMAT_VERSION,
      suite: 'smoke', startedAt: 'a', completedAt: 'b', agent: {},
      totals: { cases: 1, passed: 1, failed: 0, accuracy: 1 },
      cases: [{ id: '', input: 'hi', output: 'hello', passed: true, latencyMs: 1 }],
    })).toThrow(/id required/)
  })

  it('accepts case errors and rejects non-string errors', () => {
    const base = {
      evalFormatVersion: EVAL_FORMAT_VERSION, suite: 'smoke', startedAt: 'a', completedAt: 'b', agent: {},
      totals: { cases: 1, passed: 0, failed: 1, accuracy: 0 },
      cases: [{ id: 'c1', input: 'hi', output: '', passed: false, latencyMs: 0, error: 'failed' }],
    }
    expect(validateEvalRunResult(base).cases[0]!.error).toBe('failed')
    expect(() => validateEvalRunResult({ ...base, cases: [{ ...base.cases[0], error: 42 }] })).toThrow(/error must be string/)
  })
})

describe('matchesExpectation', () => {
  it('returns true when expected is absent', () => {
    expect(matchesExpectation('anything', undefined)).toBe(true)
  })

  it('string expectation = substring match', () => {
    expect(matchesExpectation('hello world', 'world')).toBe(true)
    expect(matchesExpectation('hello', 'world')).toBe(false)
  })

  it('contains / equalsNormalized / regex', () => {
    expect(matchesExpectation('foo bar', { contains: 'bar' })).toBe(true)
    expect(matchesExpectation('FOO   bar', { equalsNormalized: 'foo bar' })).toBe(true)
    expect(matchesExpectation('the answer is 42', { regex: { body: '\\d+' } })).toBe(true)
  })

  it('does not silently pass semantic expectations without an evaluator', () => {
    expect(matchesExpectation('anything', { semanticSimilarity: 0.8 })).toBe(false)
  })
})
