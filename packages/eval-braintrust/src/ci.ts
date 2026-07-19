import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { ExperimentResult } from './runner'

export interface RegressionThresholds {
  default?: number
  perScorer?: Record<string, number>
}

export interface RegressionAlert {
  scorer: string
  baseline: number
  current: number
  delta: number
  threshold: number
}

function assertUnitInterval(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${name} must be a finite number in [0, 1]`,
    })
  }
  return value
}

export function detectRegressions(
  baseline: ExperimentResult['summary'],
  current: ExperimentResult['summary'],
  thresholds: RegressionThresholds = {},
): RegressionAlert[] {
  const def = assertUnitInterval(thresholds.default ?? 0.05, 'thresholds.default')
  if (thresholds.perScorer) {
    for (const [name, t] of Object.entries(thresholds.perScorer)) {
      assertUnitInterval(t, `thresholds.perScorer.${name}`)
    }
  }
  const out: RegressionAlert[] = []
  for (const [scorer, { mean }] of Object.entries(current)) {
    const base = baseline[scorer]?.mean
    if (base === undefined) continue
    const t = thresholds.perScorer?.[scorer] ?? def
    const delta = base - mean
    if (delta > t) {
      out.push({ scorer, baseline: base, current: mean, delta, threshold: t })
    }
  }
  return out
}

export function formatAlertsMarkdown(alerts: RegressionAlert[]): string {
  if (alerts.length === 0) return '✅ No regressions detected.'
  const rows = alerts
    .map(
      a =>
        `| \`${a.scorer}\` | ${a.baseline.toFixed(3)} | ${a.current.toFixed(3)} | -${a.delta.toFixed(3)} | ${a.threshold.toFixed(3)} |`,
    )
    .join('\n')
  return [
    '### ⚠️ Eval regressions detected',
    '',
    '| Scorer | Baseline | Current | Delta | Threshold |',
    '|---|---|---|---|---|',
    rows,
  ].join('\n')
}
