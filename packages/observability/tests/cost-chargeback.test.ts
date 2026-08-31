import { describe, expect, it } from 'vitest'
import {
  chargebackReport,
  chargebackReportToCsv,
  type CostSample,
} from '../src/cost-chargeback'

const samples: CostSample[] = [
  {
    at: '2026-01-01T08:00:00.000Z',
    tenant: 'acme',
    user: 'alice',
    skill: 'researcher',
    model: 'gpt-4o',
    promptTokens: 1000,
    completionTokens: 500,
    costUsd: 0.0075,
  },
  {
    at: '2026-01-01T09:00:00.000Z',
    tenant: 'acme',
    user: 'alice',
    skill: 'researcher',
    model: 'gpt-4o',
    promptTokens: 200,
    completionTokens: 800,
    costUsd: 0.0085,
  },
  {
    at: '2026-01-01T10:00:00.000Z',
    tenant: 'acme',
    user: 'bob',
    skill: 'coder',
    model: 'claude-sonnet-4-6',
    promptTokens: 500,
    completionTokens: 500,
    costUsd: 0.009,
  },
  {
    at: '2026-01-01T11:00:00.000Z',
    tenant: 'globex',
    user: 'eve',
    skill: 'translator',
    model: 'gpt-4o-mini',
    promptTokens: 1000,
    completionTokens: 1000,
    // costUsd omitted — chargebackReport must compute from prices
  },
]

describe('chargebackReport — grouping', () => {
  it('groups by tenant by default', () => {
    const report = chargebackReport(samples)
    expect(report.groupBy).toBe('tenant')
    expect(report.rows.map(r => r.group).sort()).toEqual(['acme', 'globex'])
    const acme = report.rows.find(r => r.group === 'acme')!
    expect(acme.callCount).toBe(3)
    expect(acme.promptTokens).toBe(1700)
    expect(acme.completionTokens).toBe(1800)
    expect(acme.totalTokens).toBe(3500)
  })

  it('groups by tenant+user', () => {
    const report = chargebackReport(samples, { groupBy: 'tenant+user' })
    const groups = report.rows.map(r => r.group).sort()
    expect(groups).toEqual(['acme/alice', 'acme/bob', 'globex/eve'])
  })

  it('groups by skill', () => {
    const report = chargebackReport(samples, { groupBy: 'skill' })
    expect(report.rows.map(r => r.group).sort()).toEqual(['coder', 'researcher', 'translator'])
  })

  it('computes cost from prices when sample.costUsd is missing', () => {
    const report = chargebackReport(samples, { groupBy: 'tenant' })
    const globex = report.rows.find(r => r.group === 'globex')!
    expect(globex.costUsd).toBeGreaterThan(0)
    // gpt-4o-mini: 0.00015 input + 0.0006 output per 1k → 1×0.00015 + 1×0.0006 = 0.00075
    expect(globex.costUsd).toBeCloseTo(0.00075, 6)
  })

  it('sorts rows by costUsd descending', () => {
    const report = chargebackReport(samples, { groupBy: 'tenant' })
    for (let i = 0; i < report.rows.length - 1; i++) {
      expect(report.rows[i].costUsd).toBeGreaterThanOrEqual(report.rows[i + 1].costUsd)
    }
  })

  it('totalCallCount + totalCostUsd match row sums', () => {
    const report = chargebackReport(samples)
    const sumCalls = report.rows.reduce((s, r) => s + r.callCount, 0)
    const sumCost = report.rows.reduce((s, r) => s + r.costUsd, 0)
    expect(report.totalCalls).toBe(sumCalls)
    expect(report.totalCostUsd).toBeCloseTo(sumCost, 8)
  })
})

describe('chargebackReport — windowing', () => {
  it('drops samples outside [from, to]', () => {
    const report = chargebackReport(samples, {
      groupBy: 'tenant',
      from: '2026-01-01T08:30:00.000Z',
      to: '2026-01-01T10:30:00.000Z',
    })
    expect(report.totalCalls).toBe(2) // 09:00 + 10:00, drops 08:00 + 11:00
    expect(report.from).toBe('2026-01-01T08:30:00.000Z')
    expect(report.to).toBe('2026-01-01T10:30:00.000Z')
  })

  it('captures earliest + latest at within each group', () => {
    const report = chargebackReport(samples, { groupBy: 'tenant' })
    const acme = report.rows.find(r => r.group === 'acme')!
    expect(acme.firstAt).toBe('2026-01-01T08:00:00.000Z')
    expect(acme.lastAt).toBe('2026-01-01T10:00:00.000Z')
  })
})

describe('chargebackReport — timezone correctness', () => {
  it('treats from / to / sample.at as instants regardless of UTC offset', () => {
    const offsetSamples: CostSample[] = [
      {
        at: '2026-01-01T03:00:00Z',
        tenant: 'a',
        model: 'gpt-4o',
        promptTokens: 100,
        completionTokens: 100,
        costUsd: 0.001,
      },
    ]
    // String compare would exclude this sample (lexicographic).
    // Instant compare keeps it: 08:00+05:30 = 02:30Z, 08:30+05:30 = 03:00Z
    const report = chargebackReport(offsetSamples, {
      from: '2026-01-01T08:00:00+05:30',
      to: '2026-01-01T08:30:00+05:30',
    })
    expect(report.totalCalls).toBe(1)
  })

  it('drops samples with unparseable timestamps', () => {
    const bad: CostSample[] = [
      { at: 'not a date', tenant: 'a', model: 'gpt-4o', promptTokens: 1, completionTokens: 1, costUsd: 0.001 },
    ]
    expect(chargebackReport(bad, { from: '2026-01-01T00:00:00Z' }).totalCalls).toBe(0)
  })
})

describe('chargebackReportToCsv', () => {
  it('emits a header row, one row per group, plus a TOTAL footer', () => {
    const report = chargebackReport(samples, { groupBy: 'tenant' })
    const csv = chargebackReportToCsv(report)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('group,callCount,promptTokens,completionTokens,totalTokens,costUsd,firstAt,lastAt')
    expect(lines[lines.length - 1]).toMatch(/^TOTAL,\d+/)
    // Header + 2 group rows + TOTAL = 4
    expect(lines).toHaveLength(4)
  })

  it('escapes commas / quotes / newlines in group names', () => {
    const weirdSamples: CostSample[] = [
      {
        at: '2026-01-01T00:00:00.000Z',
        tenant: 'acme, "the company"',
        model: 'gpt-4o',
        promptTokens: 100,
        completionTokens: 100,
        costUsd: 0.001,
      },
    ]
    const csv = chargebackReportToCsv(chargebackReport(weirdSamples))
    expect(csv).toContain('"acme, ""the company"""')
  })

  it('rejects hostile token and cost numbers', () => {
    expect(() => chargebackReport([{ ...samples[0]!, promptTokens: Number.NaN }])).toThrow(/invalid numeric/)
    expect(() => chargebackReport([{ ...samples[0]!, costUsd: Number.POSITIVE_INFINITY }])).toThrow(/invalid numeric/)
  })
})
