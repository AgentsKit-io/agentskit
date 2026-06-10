import { describe, expect, it, vi } from 'vitest'
import { addAgent, fetchAgent, resolveSystemPrompt } from '../src/registry'
import type { RegistryAgent } from '../src/registry'

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

describe('resolveSystemPrompt', () => {
  const base: RegistryAgent = {
    id: 'x', title: 'X', description: 'd', category: 'support', packages: [], files: ['agent.ts'], sources: [],
  }

  it('prefers the hosted skill field', () => {
    const agent = { ...base, skill: { name: 'x', description: 'd', systemPrompt: 'You are X.' } }
    expect(resolveSystemPrompt(agent)).toBe('You are X.')
  })

  it('falls back to extracting the inline skill from agent.ts source', () => {
    const src = 'const skill = {\n  systemPrompt: `You are Y.\nLine two.`,\n}'
    const agent = { ...base, sources: [{ path: 'agent.ts', content: src }] }
    expect(resolveSystemPrompt(agent)).toBe('You are Y.\nLine two.')
  })

  it('unescapes backticks and ${ in the extracted prompt', () => {
    const src = 'const skill = { systemPrompt: `Use \\`code\\` and \\${vars}.` }'
    const agent = { ...base, sources: [{ path: 'agent.ts', content: src }] }
    expect(resolveSystemPrompt(agent)).toBe('Use `code` and ${vars}.')
  })

  it('returns null for a tool-composing agent (no inline prompt)', () => {
    const agent = { ...base, skill: null, sources: [{ path: 'agent.ts', content: 'import { researcher } from "@agentskit/skills"' }] }
    expect(resolveSystemPrompt(agent)).toBeNull()
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

describe('lineDiff', () => {
  it('marks added, removed, and unchanged lines', async () => {
    const { lineDiff } = await import('../src/registry')
    const d = lineDiff('a\nb\nc', 'a\nx\nc')
    expect(d.filter((l) => l.type === '-').map((l) => l.text)).toEqual(['b'])
    expect(d.filter((l) => l.type === '+').map((l) => l.text)).toEqual(['x'])
    expect(d.filter((l) => l.type === ' ').map((l) => l.text)).toEqual(['a', 'c'])
  })
})

describe('diffAgent', () => {
  const hosted = {
    id: 'x', title: 'X', description: 'd', category: 'support', packages: [], files: ['agent.ts'],
    sources: [{ path: 'agent.ts', content: 'line1\nline2\n' }],
  }
  function fetchHosted() {
    return vi.fn(async () => new Response(JSON.stringify(hosted), { status: 200 })) as unknown as typeof fetch
  }

  it('reports unchanged when local matches upstream', async () => {
    const { diffAgent } = await import('../src/registry')
    const out = await diffAgent('x', { fetchImpl: fetchHosted(), readFileImpl: async () => 'line1\nline2\n' })
    expect(out.files[0].status).toBe('unchanged')
  })

  it('reports modified with a diff', async () => {
    const { diffAgent } = await import('../src/registry')
    const out = await diffAgent('x', { fetchImpl: fetchHosted(), readFileImpl: async () => 'line1\nCHANGED\n' })
    expect(out.files[0].status).toBe('modified')
    expect(out.files[0].diff?.some((l) => l.type === '+' && l.text === 'line2')).toBe(true)
  })

  it('reports missing-local when the file is absent', async () => {
    const { diffAgent } = await import('../src/registry')
    const out = await diffAgent('x', { fetchImpl: fetchHosted(), readFileImpl: async () => null })
    expect(out.files[0].status).toBe('missing-local')
  })
})
