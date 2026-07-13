/**
 * Registry data — read at build time from the committed index in the
 * `agentskit-registry` repo (raw GitHub). The agent source stays decoupled
 * (RFC 0002); this app renders it as static pages (SSG).
 */
import { parseValidationEvidence, parseValidationSummary } from './validation'
import type { RegistryValidationEvidence, RegistryValidationSummary } from './validation'

export type { RegistryValidationEvidence, RegistryValidationSummary } from './validation'

const BASE =
  process.env.REGISTRY_DATA_BASE ??
  'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main/public/r'

export interface RegistryAgentSummary {
  id: string
  title: string
  description: string
  category: string
  version?: string
  source?: string
  license?: string
  tags?: string[]
  packages: string[]
  runnable?: boolean
  validation?: RegistryValidationSummary
}

export interface RegistryEnvVar {
  name: string
  description: string
  required?: boolean
}

export interface RegistryAgentDetail extends RegistryAgentSummary {
  env?: RegistryEnvVar[]
  skill?: { name: string; description: string; systemPrompt: string } | null
  sources?: { path: string; content: string }[]
  validation?: RegistryValidationEvidence
}

/** PascalCase factory name for an agent id, e.g. "legal-contract-reviewer" -> "LegalContractReviewer". */
export function factoryName(id: string): string {
  return id.replace(/(^|-)([a-z])/g, (_m, _s, c: string) => c.toUpperCase())
}

export async function getRegistryIndex(): Promise<RegistryAgentSummary[]> {
  try {
    const res = await fetch(`${BASE}/index.json`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = (await res.json()) as { agents?: RegistryAgentSummary[] }
    return (data.agents ?? []).map((agent) => {
      const { validation: rawValidation, ...summary } = agent
      const validation = parseValidationSummary(rawValidation)
      return validation ? { ...summary, validation } : summary
    })
  } catch {
    return []
  }
}

export async function getAgent(id: string): Promise<RegistryAgentDetail | null> {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(id)}.json`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = (await res.json()) as RegistryAgentDetail
    const { validation: rawValidation, ...agent } = data
    const validation = parseValidationEvidence(rawValidation)
    return validation ? { ...agent, validation } : agent
  } catch {
    return null
  }
}

export function groupByCategory(agents: RegistryAgentSummary[]): Record<string, RegistryAgentSummary[]> {
  const out: Record<string, RegistryAgentSummary[]> = {}
  for (const a of agents) (out[a.category] ??= []).push(a)
  return out
}

export function relatedAgents(
  current: RegistryAgentSummary,
  agents: RegistryAgentSummary[],
  limit = 4,
): RegistryAgentSummary[] {
  const tags = new Set(current.tags ?? [])
  return agents
    .filter((agent) => agent.id !== current.id)
    .map((agent) => ({
      agent,
      score: (agent.category === current.category ? 10 : 0) + (agent.tags ?? []).filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.agent.title.localeCompare(b.agent.title))
    .slice(0, limit)
    .map(({ agent }) => agent)
}
