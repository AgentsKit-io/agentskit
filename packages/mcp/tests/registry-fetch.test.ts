import { describe, expect, it, vi } from 'vitest'
import { fetchAgentSkill } from '../src/registry-fetch'

const response = (body: string, init: ResponseInit = {}): Response => new Response(body, init)

describe('fetchAgentSkill', () => {
  it('rejects unsafe ids and invalid bounds without performing IO', async () => {
    const fetchImpl = vi.fn()
    await expect(fetchAgentSkill('../private', fetchImpl as never)).resolves.toBeNull()
    await expect(fetchAgentSkill('valid', fetchImpl as never, { timeoutMs: 0 })).resolves.toBeNull()
    await expect(fetchAgentSkill('valid', fetchImpl as never, { maxResponseBytes: 2_000_000 })).resolves.toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('uses a validated hosted skill and treats explicit null as authoritative', async () => {
    const hosted = vi.fn(async () => response(JSON.stringify({
      description: ' Reviews contracts ',
      skill: { systemPrompt: ' Review safely. ' },
    })))
    await expect(fetchAgentSkill('legal-review', hosted as never)).resolves.toEqual({
      description: 'Reviews contracts',
      id: 'legal-review',
      systemPrompt: 'Review safely.',
    })

    const toolComposing = vi.fn(async () => response(JSON.stringify({ skill: null })))
    await expect(fetchAgentSkill('research', toolComposing as never)).resolves.toBeNull()
    expect(toolComposing).toHaveBeenCalledTimes(1)
  })

  it('falls back to bounded raw metadata and source', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('registry.agentskit.io')) return response('malformed-json')
      if (url.endsWith('meta.json')) return response(JSON.stringify({ description: 'Raw agent' }))
      return response('export const skill = { systemPrompt: `Use \\`care\\` and \\${context}.` }')
    })
    await expect(fetchAgentSkill('raw-agent', fetchImpl as never)).resolves.toEqual({
      description: 'Raw agent',
      id: 'raw-agent',
      systemPrompt: 'Use `care` and ${context}.',
    })
  })

  it('returns null for errors, aborts, timeouts, and oversized responses', async () => {
    const failure = vi.fn(async () => { throw new Error('network') })
    await expect(fetchAgentSkill('agent', failure as never)).resolves.toBeNull()

    const controller = new AbortController()
    controller.abort()
    await expect(fetchAgentSkill('agent', vi.fn() as never, { signal: controller.signal })).resolves.toBeNull()

    const activeController = new AbortController()
    const ignoresAbort = vi.fn(() => new Promise<Response>(() => undefined))
    const active = fetchAgentSkill('agent', ignoresAbort as never, {
      signal: activeController.signal,
      timeoutMs: 10_000,
    })
    activeController.abort()
    await expect(active).resolves.toBeNull()

    const hanging = vi.fn(() => new Promise<Response>(() => undefined))
    await expect(fetchAgentSkill('agent', hanging as never, { timeoutMs: 1 })).resolves.toBeNull()

    const oversized = vi.fn(async () => response('x'.repeat(32), {
      headers: { 'content-length': '32' },
    }))
    await expect(fetchAgentSkill('agent', oversized as never, { maxResponseBytes: 16 })).resolves.toBeNull()

    const streamed = vi.fn(async () => response('x'.repeat(32)))
    await expect(fetchAgentSkill('agent', streamed as never, { maxResponseBytes: 16 })).resolves.toBeNull()
  })

  it('rejects malformed hosted and raw payload shapes', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('registry.agentskit.io')) {
        return response(JSON.stringify({ description: 1, skill: { systemPrompt: 2 } }))
      }
      if (url.endsWith('meta.json')) return response(JSON.stringify([]))
      return response('unused')
    })
    await expect(fetchAgentSkill('agent', fetchImpl as never)).resolves.toBeNull()
  })
})
