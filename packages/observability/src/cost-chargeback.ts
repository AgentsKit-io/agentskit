import { DEFAULT_PRICES, computeCost, priceFor, type TokenPrice } from './cost-guard'
import { ConfigError, ErrorCodes } from '@agentskit/core'

/**
 * Chargeback / cost-attribution exporter. Group LLM call samples by
 * tenant + (user | skill | tool | model | custom) and produce CSV /
 * JSON for finance dashboards or per-tenant invoicing.
 *
 * Inputs are caller-supplied `CostSample[]` rows. Wire your runtime
 * to emit one sample per `llm:end` event (the `multiTenantCostGuard`
 * already tracks the same data — feed its observer hook into a
 * persistence layer to build the sample set).
 *
 * Closes #790.
 */

export interface CostSample {
  /** ISO 8601 — when the call completed. */
  at: string
  tenant: string
  /** Optional acting user id within the tenant. */
  user?: string
  /** Optional skill / tool that drove the call. */
  skill?: string
  tool?: string
  /** Model id used for this call. */
  model: string
  promptTokens: number
  completionTokens: number
  /**
   * Pre-computed cost in USD. When omitted, `chargebackReport` will
   * compute it from the (model, token counts, prices) triple.
   */
  costUsd?: number
}

export type ChargebackGroupKey =
  | 'tenant'
  | 'user'
  | 'skill'
  | 'tool'
  | 'model'
  | 'tenant+user'
  | 'tenant+skill'
  | 'tenant+tool'
  | 'tenant+model'

export interface ChargebackReportOptions {
  /** Group key. Default `'tenant'`. */
  groupBy?: ChargebackGroupKey
  /** Optional price table override for sample cost computation. */
  prices?: Record<string, TokenPrice>
  /**
   * Inclusive window filter (ISO 8601). Samples outside the window
   * are dropped before grouping.
   */
  from?: string
  to?: string
}

export interface ChargebackRow {
  /** Composite group key, joined with '/' for multi-field groups. */
  group: string
  callCount: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  /** Earliest sample timestamp in the group (ISO 8601). */
  firstAt: string
  /** Latest sample timestamp in the group (ISO 8601). */
  lastAt: string
}

export interface ChargebackReport {
  groupBy: ChargebackGroupKey
  rows: ChargebackRow[]
  /** Sum of costUsd across all rows. */
  totalCostUsd: number
  /** Sum of callCount across all rows. */
  totalCalls: number
  /** Window the report covers (whichever the caller passed). */
  from?: string
  to?: string
}

function keyOf(sample: CostSample, groupBy: ChargebackGroupKey): string {
  switch (groupBy) {
    case 'tenant':         return sample.tenant
    case 'user':           return sample.user ?? '<unknown>'
    case 'skill':          return sample.skill ?? '<unknown>'
    case 'tool':           return sample.tool ?? '<unknown>'
    case 'model':          return sample.model
    case 'tenant+user':    return `${sample.tenant}/${sample.user ?? '<unknown>'}`
    case 'tenant+skill':   return `${sample.tenant}/${sample.skill ?? '<unknown>'}`
    case 'tenant+tool':    return `${sample.tenant}/${sample.tool ?? '<unknown>'}`
    case 'tenant+model':   return `${sample.tenant}/${sample.model}`
  }
}

function inWindow(sample: CostSample, from?: string, to?: string): boolean {
  // Compare by epoch ms — string compare on ISO 8601 only works when
  // every value shares the same UTC offset. Real-world callers mix
  // `+05:30`, `Z`, and naive forms; coercing through Date.getTime
  // collapses them all to the same instant.
  const at = Date.parse(sample.at)
  if (Number.isNaN(at)) return false
  if (from) {
    const fromMs = Date.parse(from)
    if (!Number.isNaN(fromMs) && at < fromMs) return false
  }
  if (to) {
    const toMs = Date.parse(to)
    if (!Number.isNaN(toMs) && at > toMs) return false
  }
  return true
}

function validateSample(sample: CostSample, index: number): void {
  const validTokens = (value: number): boolean => Number.isFinite(value) && Number.isInteger(value) && value >= 0
  if (!sample || typeof sample.tenant !== 'string' || sample.tenant.length === 0 ||
      typeof sample.model !== 'string' || sample.model.length === 0 ||
      !validTokens(sample.promptTokens) || !validTokens(sample.completionTokens) ||
      (sample.costUsd !== undefined && (!Number.isFinite(sample.costUsd) || sample.costUsd < 0))) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `chargebackReport: invalid numeric or identity fields at samples[${index}]`,
      hint: 'Use non-negative finite integer token counts and finite non-negative costs.',
    })
  }
}

export function chargebackReport(
  samples: CostSample[],
  options: ChargebackReportOptions = {},
): ChargebackReport {
  const groupBy = options.groupBy ?? 'tenant'
  const mergedPrices = options.prices ? { ...DEFAULT_PRICES, ...options.prices } : DEFAULT_PRICES

  const groups = new Map<string, ChargebackRow>()
  let totalCallCount = 0
  let totalCost = 0

  for (const [index, sample] of samples.entries()) {
    validateSample(sample, index)
    if (!inWindow(sample, options.from, options.to)) continue
    const cost = sample.costUsd ?? computeCost(
      { promptTokens: sample.promptTokens, completionTokens: sample.completionTokens },
      priceFor(sample.model, mergedPrices),
    )
    const key = keyOf(sample, groupBy)
    let row = groups.get(key)
    if (!row) {
      row = {
        group: key,
        callCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        firstAt: sample.at,
        lastAt: sample.at,
      }
      groups.set(key, row)
    }
    row.callCount += 1
    row.promptTokens += sample.promptTokens
    row.completionTokens += sample.completionTokens
    row.totalTokens += sample.promptTokens + sample.completionTokens
    row.costUsd += cost
    if (sample.at < row.firstAt) row.firstAt = sample.at
    if (sample.at > row.lastAt) row.lastAt = sample.at
    totalCallCount += 1
    totalCost += cost
  }

  // Stable sort by costUsd desc — biggest spenders first.
  const rows = Array.from(groups.values()).sort((a, b) => b.costUsd - a.costUsd || a.group.localeCompare(b.group))

  return {
    groupBy,
    rows,
    totalCostUsd: totalCost,
    totalCalls: totalCallCount,
    from: options.from,
    to: options.to,
  }
}

const CSV_HEADERS = [
  'group',
  'callCount',
  'promptTokens',
  'completionTokens',
  'totalTokens',
  'costUsd',
  'firstAt',
  'lastAt',
] as const

function escapeCsv(field: string | number): string {
  const s = String(field)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function chargebackReportToCsv(report: ChargebackReport): string {
  const lines = [CSV_HEADERS.join(',')]
  const renderRow = (cells: Array<string | number>): string =>
    cells.map(v => escapeCsv(v)).join(',')
  for (const row of report.rows) {
    lines.push(renderRow([
      row.group,
      row.callCount,
      row.promptTokens,
      row.completionTokens,
      row.totalTokens,
      row.costUsd.toFixed(6),
      row.firstAt,
      row.lastAt,
    ]))
  }
  lines.push(renderRow([
    'TOTAL',
    report.totalCalls,
    report.rows.reduce((s, r) => s + r.promptTokens, 0),
    report.rows.reduce((s, r) => s + r.completionTokens, 0),
    report.rows.reduce((s, r) => s + r.totalTokens, 0),
    report.totalCostUsd.toFixed(6),
    report.from ?? '',
    report.to ?? '',
  ]))
  return `${lines.join('\n')}\n`
}
