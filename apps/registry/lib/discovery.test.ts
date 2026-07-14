import { describe, expect, it, vi } from 'vitest'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import {
  DETERMINISTIC_KNOWLEDGE_PROTOCOL,
  DETERMINISTIC_KNOWLEDGE_PROTOCOL_VERSION,
  DETERMINISTIC_SITE_PROTOCOL,
  DETERMINISTIC_SITE_PROTOCOL_VERSION,
  computeLocalKnowledgeArtifactContentHash,
  type LocalKnowledgeArtifactHashInput,
} from '@agentskit/chat/protocol'
import { createRegistryDiscoveryAdapter, loadRegistryDiscovery } from './discovery'

const request = (content: string): AdapterRequest => ({
  messages: [{ id: 'user-1', role: 'user', content, status: 'complete', createdAt: new Date('2026-07-13T00:00:00Z') }],
})

const read = async (adapter: AdapterFactory, content: string): Promise<StreamChunk[]> => {
  const chunks: StreamChunk[] = []
  for await (const chunk of adapter.createSource(request(content)).stream()) chunks.push(chunk)
  return chunks
}

const fixture = async () => {
  const base: LocalKnowledgeArtifactHashInput = {
    protocol: DETERMINISTIC_KNOWLEDGE_PROTOCOL,
    version: DETERMINISTIC_KNOWLEDGE_PROTOCOL_VERSION,
    artifactId: 'registry-test',
    siteId: 'registry',
    generatedAt: '2026-07-13T00:00:00.000Z',
    entries: [{
      id: 'agent:research',
      kind: 'package',
      label: 'Research Agent',
      match: { type: 'exact', values: ['research', 'npx agentskit add research'] },
      answer: {
        markdown: 'Install `research` locally.',
        citations: [{ id: 'agent:research', title: 'Research Agent', href: '/agents/research' }],
      },
    }],
  }
  const contentHash = await computeLocalKnowledgeArtifactContentHash(base)
  return {
    siteConfig: {
      protocol: DETERMINISTIC_SITE_PROTOCOL,
      version: DETERMINISTIC_SITE_PROTOCOL_VERSION,
      siteId: 'registry',
      artifact: { href: '/deterministic/knowledge.json', contentHash },
      fallback: { mode: 'backend' },
    },
    artifact: { ...base, contentHash },
  }
}

describe('Registry discovery', () => {
  it('loads both public artifacts and fails closed when either is unavailable', async () => {
    const values = await fixture()
    const ok = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(values.siteConfig)))
      .mockResolvedValueOnce(new Response(JSON.stringify(values.artifact)))
    expect(await loadRegistryDiscovery(ok, 'https://registry.example/deterministic')).toEqual(values)

    const unavailable = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}'))
    expect(await loadRegistryDiscovery(unavailable, 'https://registry.example/deterministic')).toBeNull()
  })

  it('answers exact facts with zero backend calls and escalates semantic requests once', async () => {
    const inputs = await fixture()
    const backend = vi.fn((incoming: AdapterRequest) => ({
      abort() {},
      async *stream() {
        expect(incoming.context?.metadata?.['agentskit.chat.escalation']).toMatchObject({ outcome: 'escalation', reason: 'miss' })
        yield { type: 'text' as const, content: 'Use Research Agent. [Source](/agents/research)' }
        yield { type: 'done' as const }
      },
    }))
    const fallback: AdapterFactory = { createSource: backend }
    const decisions: string[] = []
    const result = createRegistryDiscoveryAdapter({
      inputs,
      fallback,
      onDecision: (decision) => { decisions.push(`${decision.outcome}:${decision.confidence.basis}`) },
    })

    const local = await read(result.adapter, 'npx agentskit add research')
    expect(backend).not.toHaveBeenCalled()
    expect(local.some((chunk) => chunk.type === 'text' && chunk.content?.includes('Install'))).toBe(true)

    await read(result.adapter, 'Which agent fits a citation-heavy market investigation?')
    expect(backend).toHaveBeenCalledTimes(1)
    expect(decisions).toContain('answer:exact')
    expect(decisions).toContain('escalation:miss')
  })

  it('uses the backend safely when trusted site configuration is missing', async () => {
    const backend = vi.fn(() => ({
      abort() {},
      async *stream() { yield { type: 'done' as const } },
    }))
    const fallback: AdapterFactory = { createSource: backend }
    const result = createRegistryDiscoveryAdapter({ inputs: null, fallback })
    expect(result.deterministic).toBeNull()
    await read(result.adapter, 'research')
    expect(backend).toHaveBeenCalledTimes(1)
  })
})
