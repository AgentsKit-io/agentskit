import type { AdapterFactory } from '@agentskit/core'
import {
  createDeterministicAnswerAdapter,
  type DeterministicAnswerAdapter,
} from '@agentskit/chat'
import {
  decodeDeterministicSiteConfig,
  verifyLocalKnowledgeArtifactSync,
  type AnswerResponse,
} from '@agentskit/chat-protocol'

const DEFAULT_BASE =
  'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main/public/deterministic'

export interface RegistryDiscoveryInputs {
  readonly siteConfig: unknown
  readonly artifact: unknown
}

export interface RegistryDiscoveryAdapter {
  readonly adapter: AdapterFactory
  readonly deterministic: DeterministicAnswerAdapter | null
}

export async function loadRegistryDiscovery(
  fetchImpl: typeof fetch = fetch,
  base = process.env.REGISTRY_DISCOVERY_BASE ?? DEFAULT_BASE,
): Promise<RegistryDiscoveryInputs | null> {
  try {
    const signal = AbortSignal.timeout(6500)
    const [siteConfig, artifact] = await Promise.all([
      fetchImpl(`${base}/site-config.json`, { signal }),
      fetchImpl(`${base}/knowledge.json`, { signal }),
    ])
    if (!siteConfig.ok || !artifact.ok) return null
    const [siteConfigValue, artifactValue] = await Promise.all([siteConfig.json(), artifact.json()])
    return { siteConfig: siteConfigValue, artifact: artifactValue }
  } catch {
    return null
  }
}

export function createRegistryDiscoveryAdapter({
  inputs,
  fallback,
  onDecision,
}: {
  readonly inputs: RegistryDiscoveryInputs | null
  readonly fallback: AdapterFactory
  readonly onDecision?: (decision: AnswerResponse) => void | Promise<void>
}): RegistryDiscoveryAdapter {
  const site = decodeDeterministicSiteConfig(inputs?.siteConfig)
  if (!site.ok) return { adapter: fallback, deterministic: null }

  const artifact = verifyLocalKnowledgeArtifactSync(inputs?.artifact, {
    expectedContentHash: site.value.artifact.contentHash,
    expectedSiteId: site.value.siteId,
  })
  const deterministic = createDeterministicAnswerAdapter({
    artifact: artifact.ok ? artifact.value : null,
    expectedContentHash: site.value.artifact.contentHash,
    expectedSiteId: site.value.siteId,
    fallbackMode: site.value.fallback.mode,
    fallback,
    backend: { provider: 'ask-registry' },
    onDecision,
  })
  return { adapter: deterministic, deterministic }
}
