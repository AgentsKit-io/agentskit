import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { ExperimentResult } from './runner'

/** Global and scorer-specific score drop limits used by {@link detectRegressions}. */
export interface RegressionThresholds {
  default?: number
  perScorer?: Record<string, number>
}

/** One scorer whose current mean dropped beyond its configured threshold. */
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

/** Find scorers whose mean score fell by more than their configured threshold.
 *
 * @param baseline Baseline scorer means and sample counts.
 * @param current Current scorer means and sample counts.
 * @param thresholds Optional default and per-scorer maximum drops; default is 0.05.
 * @returns Regression alerts for scorers present in both summaries.
 * @throws ConfigError when a threshold is not a finite number in [0, 1].
 * @example
 * ```ts
 * const alerts = detectRegressions(previous.summary, latest.summary, { default: 0.05 })
 * ```
 */
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

/** Render regression alerts as a Markdown table, or a no-regressions message.
 *
 * @param alerts Alerts returned by {@link detectRegressions}.
 * @returns A Markdown summary suitable for a pull request or CI report.
 */
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
