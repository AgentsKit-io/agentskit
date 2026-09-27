import { describe, expect, it } from 'vitest'
import { compareToBaseline, countFindings, tightenBaseline, type Baseline } from '../src/lint/baseline'
import type { Finding } from '../src/lint/scan'

function finding(file: string, rule: string, line = 1): Finding {
  return { file, line, rule, message: 'm', fix: 'f()' }
}

const baseline: Baseline = {
  version: 1,
  include: ['packages'],
  exclude: [],
  entries: { 'a.ts': { 'split-newline': 2 }, 'gone.ts': { 'home-env': 1 } },
}

describe('baseline ratchet', () => {
  it('counts findings per file and rule', () => {
    expect(countFindings([finding('a.ts', 'x'), finding('a.ts', 'x'), finding('b.ts', 'y')])).toEqual({
      'a.ts': { x: 2 },
      'b.ts': { y: 1 },
    })
  })

  it('passes at or below the baseline and reports improvements', () => {
    const result = compareToBaseline([finding('a.ts', 'split-newline')], baseline)
    expect(result.regressions).toEqual([])
    expect(result.improvements).toEqual([
      { file: 'a.ts', rule: 'split-newline', allowed: 2, actual: 1 },
      { file: 'gone.ts', rule: 'home-env', allowed: 1, actual: 0 },
    ])
  })

  it('fails on a higher count or a new file', () => {
    const findings = [finding('a.ts', 'split-newline', 1), finding('a.ts', 'split-newline', 2), finding('a.ts', 'split-newline', 3), finding('new.ts', 'home-env')]
    const { regressions } = compareToBaseline(findings, baseline)
    expect(regressions).toHaveLength(4)
  })

  it('only tightens unless an increase is allowed', () => {
    const lower = tightenBaseline([finding('a.ts', 'split-newline')], baseline, false)
    expect(lower.increased).toEqual([])
    expect(lower.baseline.entries).toEqual({ 'a.ts': { 'split-newline': 1 } })

    const higher = [finding('new.ts', 'home-env')]
    const refused = tightenBaseline(higher, baseline, false)
    expect(refused.increased).toEqual(['new.ts [home-env]'])
    expect(refused.baseline).toBe(baseline)
    expect(tightenBaseline(higher, baseline, true).baseline.entries).toEqual({ 'new.ts': { 'home-env': 1 } })
  })
})
