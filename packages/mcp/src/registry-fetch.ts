const HOSTED = 'https://registry.agentskit.io/r'
const RAW = 'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main'

export interface FetchedAgentSkill {
  id: string
  description: string
  systemPrompt: string
}

/**
 * Fetch a registry agent's runnable skill (id, description, systemPrompt) so it
 * can be exposed as an MCP tool. Hosted index first, raw-GitHub fallback. Returns
 * null for tool-composing agents (no inline prompt) or unknown ids.
 */
export async function fetchAgentSkill(
  id: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<FetchedAgentSkill | null> {
  const tryUrl = async (url: string): Promise<unknown | null> => {
    try {
      const res = await fetchImpl(url)
      return res.ok ? await res.json() : null
    } catch {
      return null
    }
  }

  const hosted = (await tryUrl(`${HOSTED}/${id}.json`)) as
    | { description?: string; skill?: { systemPrompt?: string } | null }
    | null
  if (hosted?.skill?.systemPrompt) {
    return { id, description: hosted.description ?? id, systemPrompt: hosted.skill.systemPrompt }
  }

  // Fallback: extract the inline skill from the raw agent.ts source.
  const meta = (await tryUrl(`${RAW}/registry/${id}/meta.json`)) as { description?: string } | null
  if (!meta) return null
  let src: string | null = null
  try {
    const res = await fetchImpl(`${RAW}/registry/${id}/agent.ts`)
    src = res.ok ? await res.text() : null
  } catch {
    src = null
  }
  if (!src) return null
  const m = src.match(/systemPrompt:\s*`((?:\\.|[^`\\])*)`/)
  if (!m) return null
  return {
    id,
    description: meta.description ?? id,
    systemPrompt: m[1].replace(/\\`/g, '`').replace(/\\\$\{/g, '${'),
  }
}
