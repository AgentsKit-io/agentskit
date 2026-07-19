import { describe, expect, it } from 'vitest'
import { detectRegressions, formatAlertsMarkdown } from '../src/ci'

describe('detectRegressions', () => {
  it('flags scorer drops above threshold', () => {
    const a = detectRegressions(
      { x: { mean: 0.9, n: 10 }, y: { mean: 0.8, n: 10 } },
      { x: { mean: 0.7, n: 10 }, y: { mean: 0.79, n: 10 } },
      { default: 0.05 },
    )
    expect(a).toHaveLength(1)
    expect(a[0]?.scorer).toBe('x')
  })

  it('honors per-scorer overrides', () => {
    const a = detectRegressions(
      { x: { mean: 0.9, n: 10 } },
      { x: { mean: 0.85, n: 10 } },
      { default: 0.1, perScorer: { x: 0.01 } },
    )
    expect(a).toHaveLength(1)
  })

  it('skips scorers missing from baseline', () => {
    const a = detectRegressions({}, { x: { mean: 0, n: 1 } })
    expect(a).toHaveLength(0)
  })

  it('rejects non-finite / out-of-range thresholds', () => {
    expect(() =>
      detectRegressions({ x: { mean: 1, n: 1 } }, { x: { mean: 0, n: 1 } }, { default: Number.NaN }),
    ).toThrow(/\[0, 1\]/)
    expect(() =>
      detectRegressions({ x: { mean: 1, n: 1 } }, { x: { mean: 0, n: 1 } }, { default: 1.5 }),
    ).toThrow(/\[0, 1\]/)
    expect(() =>
      detectRegressions(
        { x: { mean: 1, n: 1 } },
        { x: { mean: 0, n: 1 } },
        { perScorer: { x: -0.1 } },
      ),
    ).toThrow(/\[0, 1\]/)
  })
})

describe('formatAlertsMarkdown', () => {
  it('returns clean message when nothing regressed', () => {
    expect(formatAlertsMarkdown([])).toContain('No regressions')
  })

  it('renders a markdown table when regressions exist', () => {
    const md = formatAlertsMarkdown([
      { scorer: 'task_success', baseline: 0.9, current: 0.7, delta: 0.2, threshold: 0.05 },
    ])
    expect(md).toContain('| `task_success` |')
    expect(md).toContain('Baseline')
  })
})
