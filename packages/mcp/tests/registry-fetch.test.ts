import { createServer } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { fetchAgent, fetchAgentSkill } from '../src/registry-fetch'

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

  it('does not flatten typed projections into the generic task tool', async () => {
    const hosted = vi.fn(async () => response(JSON.stringify({
      description: 'Typed agent',
      projections: {
        mcp: {
          inputSchema: { type: 'object' },
          mode: 'typed',
          outputSchema: { type: 'object' },
          resultToolName: 'submit_typed_agent',
          status: 'planned',
        },
      },
      skill: { systemPrompt: 'Do not flatten me.' },
    })))
    await expect(fetchAgent('typed-agent', hosted as never)).resolves.toMatchObject({
      mode: 'typed', resultToolName: 'submit_typed_agent',
    })
    await expect(fetchAgentSkill('typed-agent', hosted as never)).resolves.toBeNull()

    const raw = vi.fn(async (url: string) => {
      if (new URL(url).origin === 'https://registry.agentskit.io') return response('malformed-json')
      if (url.endsWith('meta.json')) return response(JSON.stringify({ projections: { mcp: { mode: 'typed' } } }))
      return response('export const skill = { systemPrompt: `Do not flatten me.` }')
    })
    await expect(fetchAgentSkill('typed-agent', raw as never)).resolves.toBeNull()
    expect(raw).toHaveBeenCalledTimes(2)
  })

  it('falls back to bounded raw metadata and source', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (new URL(url).origin === 'https://registry.agentskit.io') return response('malformed-json')
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
      if (new URL(url).origin === 'https://registry.agentskit.io') {
        return response(JSON.stringify({ description: 1, skill: { systemPrompt: 2 } }))
      }
      if (url.endsWith('meta.json')) return response(JSON.stringify([]))
      return response('unused')
    })
    await expect(fetchAgentSkill('agent', fetchImpl as never)).resolves.toBeNull()
  })
})

describe('registry fetches through a local HTTP endpoint', () => {
  it('preserves projections and fallback while bounding and cancelling real response streams', async () => {
    const rawRegistry = '/AgentsKit-io/agentskit-registry/main/registry'
    const declaredAgentPath = `${rawRegistry}/declared-agent/agent.ts`
    const chunkedAgentPath = `${rawRegistry}/chunked-agent/agent.ts`
    const abortAgentPath = '/r/abort-agent.json'
    const requests: string[] = []
    const cancelled: string[] = []
    const closeWaiters = new Map<string, () => void>()
    let hostedAbortStarted!: () => void
    const abortStarted = new Promise<void>((resolve) => {
      hostedAbortStarted = resolve
    })

    const server = createServer((request, response) => {
      const path = request.url ?? '/'
      requests.push(path)
      response.on('close', () => {
        if (!response.writableEnded) {
          cancelled.push(path)
          if (path === declaredAgentPath) closeWaiters.get(declaredAgentPath)?.()
          if (path === chunkedAgentPath) closeWaiters.get(chunkedAgentPath)?.()
          if (path === abortAgentPath) closeWaiters.get(abortAgentPath)?.()
        }
      })

      if (path === '/r/typed-agent.json') {
        response.end(JSON.stringify({
          description: 'Typed agent',
          projections: { mcp: {
            inputSchema: { type: 'object' },
            mode: 'typed',
            outputSchema: { type: 'object' },
            resultToolName: 'submit_result',
          } },
          skill: { systemPrompt: 'Use the typed tool.' },
        }))
      } else if (path === '/r/skill-agent.json') {
        response.end(JSON.stringify({ description: 'Text agent', skill: { systemPrompt: 'Review safely.' } }))
      } else if (path === '/r/raw-agent.json') {
        response.statusCode = 404
        response.end()
      } else if (path === `${rawRegistry}/raw-agent/meta.json`) {
        response.end(JSON.stringify({ description: 'Raw agent' }))
      } else if (path === `${rawRegistry}/raw-agent/agent.ts`) {
        const body = Buffer.from('export const skill = { systemPrompt: `Use 💡 safely.` }')
        const split = body.indexOf(Buffer.from('💡')) + 2
        response.write(body.subarray(0, split))
        setTimeout(() => response.end(body.subarray(split)), 10)
      } else if (path === '/r/malformed-agent.json') {
        response.end('{malformed')
      } else if (path === `${rawRegistry}/malformed-agent/meta.json`) {
        response.end('{malformed')
      } else if (path === '/r/declared-agent.json' || path === '/r/chunked-agent.json') {
        response.statusCode = 404
        response.end()
      } else if (path === `${rawRegistry}/declared-agent/meta.json` || path === `${rawRegistry}/chunked-agent/meta.json`) {
        response.end('{}')
      } else if (path === declaredAgentPath) {
        response.setHeader('content-length', '2048')
        response.write('partial')
      } else if (path === chunkedAgentPath) {
        response.write('1234567890123456')
        const timer = setTimeout(() => {
          if (!response.destroyed) response.write('7890123456789012')
        }, 10)
        response.on('close', () => clearTimeout(timer))
      } else if (path === abortAgentPath) {
        response.write('{"skill":{"systemPrompt":"')
        const timer = setTimeout(() => response.end('held"}}'), 5000)
        response.on('close', () => clearTimeout(timer))
        hostedAbortStarted()
      } else {
        response.statusCode = 404
        response.end()
      }
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject)
        resolve()
      })
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('local registry did not bind a TCP port')
    const fetchImpl: typeof fetch = (input, init) => {
      let original: string
      if (input instanceof Request) original = input.url
      else if (input instanceof URL) original = input.href
      else original = input
      const { pathname } = new URL(original)
      return fetch(`http://127.0.0.1:${address.port}${pathname}`, init)
    }
    const waitForCancellation = (path: string): Promise<void> => new Promise((resolve, reject) => {
      if (cancelled.includes(path)) {
        resolve()
        return
      }
      const timer = setTimeout(() => {
        closeWaiters.delete(path)
        reject(new Error(`response stream was not cancelled: ${path}`))
      }, 2000)
      closeWaiters.set(path, () => {
        clearTimeout(timer)
        resolve()
      })
    })

    try {
      await expect(fetchAgent('typed-agent', fetchImpl)).resolves.toMatchObject({
        mode: 'typed',
        resultToolName: 'submit_result',
      })
      await expect(fetchAgentSkill('skill-agent', fetchImpl)).resolves.toEqual({
        description: 'Text agent',
        id: 'skill-agent',
        systemPrompt: 'Review safely.',
      })
      const rawStart = requests.length
      const rawAgent = await fetchAgentSkill('raw-agent', fetchImpl)
      expect(requests.slice(rawStart)).toEqual([
        '/r/raw-agent.json',
        `${rawRegistry}/raw-agent/meta.json`,
        `${rawRegistry}/raw-agent/agent.ts`,
      ])
      expect(rawAgent).toEqual({
        description: 'Raw agent',
        id: 'raw-agent',
        systemPrompt: 'Use 💡 safely.',
      })

      const malformedStart = requests.length
      await expect(fetchAgentSkill('malformed-agent', fetchImpl)).resolves.toBeNull()
      expect(requests.slice(malformedStart)).toEqual([
        '/r/malformed-agent.json',
        `${rawRegistry}/malformed-agent/meta.json`,
      ])

      const declaredClosed = waitForCancellation(declaredAgentPath)
      const declaredStart = requests.length
      await expect(fetchAgentSkill('declared-agent', fetchImpl, { maxResponseBytes: 16 })).resolves.toBeNull()
      await declaredClosed
      expect(requests.slice(declaredStart)).toEqual([
        '/r/declared-agent.json',
        `${rawRegistry}/declared-agent/meta.json`,
        `${rawRegistry}/declared-agent/agent.ts`,
      ])

      const chunkedClosed = waitForCancellation(chunkedAgentPath)
      const chunkedStart = requests.length
      await expect(fetchAgentSkill('chunked-agent', fetchImpl, { maxResponseBytes: 16 })).resolves.toBeNull()
      await chunkedClosed
      expect(requests.slice(chunkedStart)).toEqual([
        '/r/chunked-agent.json',
        `${rawRegistry}/chunked-agent/meta.json`,
        `${rawRegistry}/chunked-agent/agent.ts`,
      ])

      const abortClosed = waitForCancellation(abortAgentPath)
      const abortController = new AbortController()
      const abortStart = requests.length
      const abortedFetch = fetchAgentSkill('abort-agent', fetchImpl, { signal: abortController.signal })
      await abortStarted
      abortController.abort()
      await expect(abortedFetch).resolves.toBeNull()
      await abortClosed
      expect(requests.slice(abortStart)).toEqual(['/r/abort-agent.json'])
    } finally {
      const closed = new Promise<void>((resolve) => server.close(() => resolve()))
      server.closeAllConnections()
      await closed
    }
  })
})
