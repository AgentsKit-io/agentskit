import React from 'react'

/** Structural subset of the observability `CostWindow`, so no dependency is needed. */
export interface UsageMeterWindow {
  spentUsd: number
  reservedUsd?: number
  capUsd?: number
  utilization?: number
}

/** Visual state of the usage meter: ok, warning, or out. */
export type UsageMeterState = 'ok' | 'warning' | 'out'

/** Props for the presentational usage/quota bar. All text comes from props. */
export interface UsageMeterProps {
  window: UsageMeterWindow
  /** Utilization (0-1) at which the bar enters the warning state. Default 0.8. */
  warningThreshold?: number
  /** Visible label, e.g. "Monthly usage". */
  label: string
  /** Formats the percentage text. Defaults to `"<n>%"`. */
  formatPercent?: (percent: number) => string
  /** Text shown in the warning state. */
  warningLabel?: string
  /** Text shown in the out state. */
  outLabel?: string
}

/**
 * Show how much of a cost window is used, with warning and out states.
 * @param props The cost window, threshold, and labels.
 * @returns The meter element, or `null` when the window has no cap.
 */
export function UsageMeter({
  window: costWindow,
  warningThreshold = 0.8,
  label,
  formatPercent = percent => `${percent}%`,
  warningLabel,
  outLabel,
}: UsageMeterProps) {
  const { spentUsd, reservedUsd = 0, capUsd } = costWindow
  const raw =
    costWindow.utilization ?? (capUsd && capUsd > 0 ? (spentUsd + reservedUsd) / capUsd : undefined)
  if (raw === undefined || !Number.isFinite(raw)) return null

  const utilization = Math.max(0, raw)
  const percent = Math.min(100, Math.round(utilization * 100))
  const state: UsageMeterState =
    utilization >= 1 ? 'out' : utilization >= warningThreshold ? 'warning' : 'ok'
  const stateLabel = state === 'out' ? outLabel : state === 'warning' ? warningLabel : undefined

  return (
    <div data-ak-usage-meter data-ak-state={state}>
      <div data-ak-usage-meter-header>
        <span data-ak-usage-meter-label>{label}</span>
        <span data-ak-usage-meter-percent>{formatPercent(percent)}</span>
      </div>
      <div
        data-ak-usage-meter-track
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div data-ak-usage-meter-fill style={{ width: `${percent}%` }} />
      </div>
      {stateLabel ? <span data-ak-usage-meter-status>{stateLabel}</span> : null}
    </div>
  )
}
