import type { RegistryAgentDetail, RegistryAgentSummary } from './registry'

export const MAX_COMPARE_AGENTS = 3

export type CatalogSort = 'recommended' | 'score' | 'name'

export interface CatalogFilters {
  query: string
  category: string
  reviewed: boolean
  runnable: boolean
  sort: CatalogSort
}

function searchText(agent: RegistryAgentSummary): string {
  return [agent.title, agent.description, agent.id, agent.category, ...(agent.tags ?? [])]
    .join(' ')
    .toLocaleLowerCase()
}

function recommendationScore(agent: RegistryAgentSummary): number {
  return (agent.validation?.score ?? 0) * 10 + (agent.validation ? 100 : 0) + (agent.runnable ? 10 : 0)
}

export function filterAndSortAgents(
  agents: RegistryAgentSummary[],
  filters: CatalogFilters,
): RegistryAgentSummary[] {
  const needle = filters.query.trim().toLocaleLowerCase()
  const result = agents.filter((agent) => {
    if (filters.category && agent.category !== filters.category) return false
    if (filters.reviewed && !agent.validation) return false
    if (filters.runnable && !agent.runnable) return false
    return !needle || searchText(agent).includes(needle)
  })

  return result.sort((a, b) => {
    if (filters.sort === 'name') return a.title.localeCompare(b.title)
    if (filters.sort === 'score') {
      return (b.validation?.score ?? -1) - (a.validation?.score ?? -1) || a.title.localeCompare(b.title)
    }
    return recommendationScore(b) - recommendationScore(a) || a.title.localeCompare(b.title)
  })
}

export function parseCompareIds(value: string | string[] | null | undefined, validIds?: Set<string>): string[] {
  if (!value) return []
  const ids: string[] = []

  const candidates = (Array.isArray(value) ? value : [value]).flatMap((item) => item.split(','))
  for (const candidate of candidates) {
    const id = candidate.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) continue
    if (validIds && !validIds.has(id)) continue
    if (!ids.includes(id)) ids.push(id)
    if (ids.length === MAX_COMPARE_AGENTS) break
  }

  return ids
}

export function toggleCompareId(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((candidate) => candidate !== id)
  if (ids.length >= MAX_COMPARE_AGENTS) return ids
  return [...ids, id]
}

export function mergeComparisonSummary(
  detail: RegistryAgentDetail,
  summary?: RegistryAgentSummary,
): RegistryAgentDetail {
  return { ...detail, runnable: summary?.runnable ?? detail.runnable }
}

export function comparisonControlLabel(agent: RegistryAgentSummary, categoryLabel: string): string {
  return `Compare ${agent.title} (${categoryLabel})`
}
