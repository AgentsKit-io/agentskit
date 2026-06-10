/**
 * AgentsKit Registry data — fetched from the committed index in the
 * `agentskit-registry` repo (raw GitHub, server-side, revalidated). Keeps the
 * agent source decoupled (RFC 0002) while the gallery lives in the docs site.
 */
const BASE = 'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main/public/r'
const REVALIDATE = 3600 // 1h — new agents appear without a docs rebuild

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
}

export interface RegistryEnvVar {
  name: string
  description: string
  required?: boolean
}

export interface RegistryAgentDetail extends RegistryAgentSummary {
  env?: RegistryEnvVar[]
  skill?: { name: string; description: string; systemPrompt: string } | null
}

export async function getRegistryIndex(): Promise<RegistryAgentSummary[]> {
  try {
    const res = await fetch(`${BASE}/index.json`, { next: { revalidate: REVALIDATE } })
    if (!res.ok) return []
    const data = (await res.json()) as { agents?: RegistryAgentSummary[] }
    return data.agents ?? []
  } catch {
    return []
  }
}

export async function getAgent(id: string): Promise<RegistryAgentDetail | null> {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(id)}.json`, { next: { revalidate: REVALIDATE } })
    if (!res.ok) return null
    return (await res.json()) as RegistryAgentDetail
  } catch {
    return null
  }
}

export function groupByCategory(agents: RegistryAgentSummary[]): Record<string, RegistryAgentSummary[]> {
  const out: Record<string, RegistryAgentSummary[]> = {}
  for (const a of agents) (out[a.category] ??= []).push(a)
  return out
}
