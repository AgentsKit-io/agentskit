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
      totals: { cases: 0, passed: 0, failed: 0, accuracy: 0 },
      cases: [],
    })
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
})
