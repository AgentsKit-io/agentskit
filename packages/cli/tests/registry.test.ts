import { describe, expect, it, vi } from 'vitest'
import { addAgent, fetchAgent } from '../src/registry'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}
function textResponse(body: string): Response {
  return new Response(body, { status: 200 })
}
function notFound(): Response {
  return new Response('not found', { status: 404 })
}

const META = {
  id: 'research',
  title: 'Research Agent',
  description: 'd',
  category: 'research',
  packages: ['@agentskit/runtime'],
  env: [{ name: 'OPENAI_API_KEY', description: 'k', required: false }],
  files: ['agent.ts'],
}

describe('fetchAgent', () => {
  it('uses the hosted index when it has inlined sources', async () => {
    const hosted = { ...META, sources: [{ path: 'agent.ts', content: 'export const x = 1' }] }
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).toContain('registry.agentskit.io/r/research.json')
      return jsonResponse(hosted)
    }) as unknown as typeof fetch
    const agent = await fetchAgent('research', { fetchImpl })
    expect(agent.sources[0].content).toBe('export const x = 1')
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('falls back to raw GitHub when hosted is unavailable', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('registry.agentskit.io')) return notFound()
      if (url.endsWith('/meta.json')) return jsonResponse(META)
      if (url.endsWith('/agent.ts')) return textResponse('export const y = 2')
      return notFound()
    }) as unknown as typeof fetch
    const agent = await fetchAgent('research', { fetchImpl })
    expect(agent.sources).toEqual([{ path: 'agent.ts', content: 'export const y = 2' }])
  })
})

describe('addAgent', () => {
  it('writes fetched sources and reports packages/env', async () => {
    const hosted = { ...META, sources: [{ path: 'agent.ts', content: 'CODE' }] }
    const fetchImpl = vi.fn(async () => jsonResponse(hosted)) as unknown as typeof fetch
    const writes: Record<string, string> = {}
    const result = await addAgent('research', {
      fetchImpl,
      existsImpl: async () => false,
      writeFileImpl: async (p, c) => {
        writes[p] = c
      },
    })
    expect(result.targetDir).toBe('agents/research')
    expect(writes['agents/research/agent.ts']).toBe('CODE')
    expect(result.agent.packages).toContain('@agentskit/runtime')
  })

  it('refuses to overwrite without force', async () => {
    const hosted = { ...META, sources: [{ path: 'agent.ts', content: 'CODE' }] }
    const fetchImpl = vi.fn(async () => jsonResponse(hosted)) as unknown as typeof fetch
    await expect(
      addAgent('research', { fetchImpl, existsImpl: async () => true, writeFileImpl: async () => {} }),
    ).rejects.toThrow(/already exists/)
  })

  it('overwrites with force', async () => {
    const hosted = { ...META, sources: [{ path: 'agent.ts', content: 'CODE' }] }
    const fetchImpl = vi.fn(async () => jsonResponse(hosted)) as unknown as typeof fetch
    const writes: string[] = []
    await addAgent('research', {
      force: true,
      fetchImpl,
      existsImpl: async () => true,
      writeFileImpl: async (p) => {
        writes.push(p)
      },
    })
    expect(writes).toEqual(['agents/research/agent.ts'])
  })
})
