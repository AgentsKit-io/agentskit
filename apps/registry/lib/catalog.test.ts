import { describe, expect, it } from 'vitest'
import type { RegistryAgentSummary } from './registry'
import { comparisonControlLabel, filterAndSortAgents, mergeComparisonSummary, parseCompareIds, toggleCompareId } from './catalog'

const agents: RegistryAgentSummary[] = [
  {
    id: 'basic-agent',
    title: 'Basic Agent',
    description: 'A general assistant',
    category: 'ops',
    packages: ['@agentskit/core'],
  },
  {
    id: 'reviewed-agent',
    title: 'Reviewed Agent',
    description: 'Triages urgent incidents',
    category: 'ops',
    packages: ['@agentskit/core'],
    runnable: true,
    validation: { status: 'approved', score: 97, confidence: 0.98 },
  },
  {
    id: 'research-agent',
    title: 'Research Agent',
    description: 'Finds cited sources',
    category: 'research',
    packages: ['@agentskit/core'],
    validation: { status: 'approved', score: 95, confidence: 0.95 },
  },
]

describe('filterAndSortAgents', () => {
  it('combines text, category, review, and runnable filters', () => {
    expect(filterAndSortAgents(agents, {
      query: 'incident',
      category: 'ops',
      reviewed: true,
      runnable: true,
      sort: 'recommended',
    }).map((agent) => agent.id)).toEqual(['reviewed-agent'])
  })

  it('sorts approved evidence before unreviewed agents by default', () => {
    expect(filterAndSortAgents(agents, {
      query: '',
      category: '',
      reviewed: false,
      runnable: false,
      sort: 'recommended',
    }).map((agent) => agent.id)).toEqual(['reviewed-agent', 'research-agent', 'basic-agent'])
  })

  it('supports stable alphabetical and review-score ordering', () => {
    const base = { query: '', category: '', reviewed: false, runnable: false }
    expect(filterAndSortAgents(agents, { ...base, sort: 'name' }).map((agent) => agent.id))
      .toEqual(['basic-agent', 'research-agent', 'reviewed-agent'])
    expect(filterAndSortAgents(agents, { ...base, sort: 'score' }).map((agent) => agent.id))
      .toEqual(['reviewed-agent', 'research-agent', 'basic-agent'])
  })
})

describe('comparison selection', () => {
  it('normalizes, deduplicates, validates, and caps URL ids', () => {
    const valid = new Set(agents.map((agent) => agent.id))
    expect(parseCompareIds(' reviewed-agent,bad_ID,reviewed-agent,research-agent,basic-agent,extra-agent ', valid))
      .toEqual(['reviewed-agent', 'research-agent', 'basic-agent'])
  })

  it('accepts repeated query parameters without throwing', () => {
    const valid = new Set(agents.map((agent) => agent.id))
    expect(parseCompareIds(['reviewed-agent', 'research-agent,basic-agent'], valid))
      .toEqual(['reviewed-agent', 'research-agent', 'basic-agent'])
  })

  it('toggles ids without exceeding three selections', () => {
    expect(toggleCompareId(['basic-agent'], 'basic-agent')).toEqual([])
    expect(toggleCompareId(['basic-agent'], 'reviewed-agent')).toEqual(['basic-agent', 'reviewed-agent'])
    expect(toggleCompareId(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c'])
  })

  it('preserves index-only runtime capability on comparison details', () => {
    const { validation: _validation, ...summaryFields } = agents[1]
    const detail = { ...summaryFields, runnable: undefined }
    expect(mergeComparisonSummary(detail, agents[1]).runnable).toBe(true)
    expect(mergeComparisonSummary(detail).runnable).toBeUndefined()
  })

  it('disambiguates comparison controls for agents with duplicate titles', () => {
    const hr = { ...agents[0], id: 'hr-drafter', title: 'Offer Letter Drafter', category: 'hr' }
    const realEstate = { ...agents[0], id: 'realestate-drafter', title: 'Offer Letter Drafter', category: 'realestate' }
    expect(comparisonControlLabel(hr, 'HR')).toBe('Compare Offer Letter Drafter (HR)')
    expect(comparisonControlLabel(realEstate, 'Real Estate')).toBe('Compare Offer Letter Drafter (Real Estate)')
  })
})
