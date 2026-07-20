import { describe, it, expect, vi } from 'vitest'
import { ErrorCodes, type ToolDefinition } from '@agentskit/core'
import { createInMemoryTransportPair, type JsonRpcMessage } from '@agentskit/tools/mcp'
import { createAgentsKitMcpServer } from '../src/index'

const echo: ToolDefinition = {
  name: 'echo',
  description: 'Echo the input text.',
  schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  execute: (args: Record<string, unknown>) => ({ echoed: args.text }),
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('createAgentsKitMcpServer', () => {
  it('lists and calls exposed tools over an MCP transport', async () => {
    const [client, server] = createInMemoryTransportPair()
    const srv = createAgentsKitMcpServer({ tools: [echo], transport: server })

    const got: JsonRpcMessage[] = []
    client.onMessage((m) => got.push(m))

    await client.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    await client.send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
    await client.send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'echo', arguments: { text: 'hi' } },
    })
    await flush()

    const serialized = JSON.stringify(got)
    expect(serialized).toContain('echo')
    expect(serialized).toContain('hi')

    const listResponse = got.find((m) => 'id' in m && m.id === 2)
    expect(listResponse).toBeDefined()

    await srv.close()
  })

  it('reports tool errors via onEvent without crashing', async () => {
    const boom: ToolDefinition = {
      name: 'boom',
      description: 'always throws',
      schema: { type: 'object' },
      execute: () => {
        throw new Error('kaboom')
      },
    }
    const [client, server] = createInMemoryTransportPair()
    const events: string[] = []
    const srv = createAgentsKitMcpServer({
      tools: [boom],
      transport: server,
      onEvent: (e) => events.push(e.type),
    })
    client.onMessage(() => {})
    await client.send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'boom', arguments: {} } })
    await flush()
    expect(events).toContain('error')
    await srv.close()
  })

  it('rejects malformed and duplicate tool definitions', () => {
    expect(() => createAgentsKitMcpServer(undefined as never)).toThrow(
      expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }),
    )
    expect(() => createAgentsKitMcpServer({ tools: [{ ...echo, name: 'bad name' }] })).toThrow(
      expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }),
    )
    expect(() => createAgentsKitMcpServer({ tools: [echo, echo] })).toThrow(/unique/)
    expect(() => createAgentsKitMcpServer({ tools: [], transport: {} as never })).toThrow(/transport/)
    expect(() => createAgentsKitMcpServer({ tools: [], serverInfo: { name: '', version: '1' } })).toThrow(
      /serverInfo.name/,
    )
  })

  it('snapshots tool definitions and isolates observer failures', async () => {
    const [client, server] = createInMemoryTransportPair()
    const original = { ...echo }
    const unhandled = vi.fn()
    process.once('unhandledRejection', unhandled)
    const srv = createAgentsKitMcpServer({
      tools: [original],
      transport: server,
      onEvent: async () => { throw new Error('observer failure') },
    })
    original.name = 'mutated'
    const received: JsonRpcMessage[] = []
    client.onMessage((message) => received.push(message))
    await client.send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    await flush()

    expect(JSON.stringify(received)).toContain('echo')
    expect(JSON.stringify(received)).not.toContain('mutated')
    expect(unhandled).not.toHaveBeenCalled()
    process.removeListener('unhandledRejection', unhandled)
    await srv.close()
  })
})

describe('createAgentTool', () => {
  it('exposes an agent as a tool whose execute runs it via the adapter', async () => {
    const { createAgentTool } = await import('../src/agent-tool')
    const { mockAdapter } = await import('@agentskit/adapters')
    const tool = createAgentTool({
      id: 'legal-contract-reviewer',
      description: 'Reviews a contract.',
      systemPrompt: 'You review contracts.',
      adapter: mockAdapter({ response: [{ type: 'text', content: 'Reviewed: 2 risks.' }] }),
    })
    expect(tool.name).toBe('legal-contract-reviewer')
    expect(tool.schema?.required).toContain('task')
    const out = (await tool.execute?.({ task: 'review this NDA' }, {} as never)) as { content: string }
    expect(out.content).toContain('Reviewed')
  })

  it('validates agent configuration and task input', async () => {
    const { createAgentTool } = await import('../src/agent-tool')
    const { mockAdapter } = await import('@agentskit/adapters')
    const adapter = mockAdapter({ response: [{ type: 'text', content: 'ok' }] })

    expect(() => createAgentTool({
      id: 'bad name', description: 'd', systemPrompt: 'p', adapter,
    })).toThrow(expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }))
    expect(() => createAgentTool({
      id: 'agent', description: 'd', systemPrompt: 'p', adapter, maxSteps: 0,
    })).toThrow(/maxSteps/)
    expect(() => createAgentTool({
      id: 'agent', description: 'd', systemPrompt: 'p', adapter: {} as never,
    })).toThrow(expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }))

    const tool = createAgentTool({
      id: 'agent', description: 'd', systemPrompt: 'p', adapter, maxTaskBytes: 4,
    })
    await expect(tool.execute?.({}, {} as never)).rejects.toMatchObject({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
    })
    await expect(tool.execute?.({ task: '12345' }, {} as never)).rejects.toMatchObject({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
    })
  })
})

describe('fetchAgentSkill', () => {
  it('reads the skill from the hosted index', async () => {
    const { fetchAgentSkill } = await import('../src/registry-fetch')
    const fetchImpl = (async (url: string) => {
      expect(url).toContain('/legal-contract-reviewer.json')
      return new Response(
        JSON.stringify({ description: 'Reviews contracts', skill: { systemPrompt: 'You review contracts.' } }),
        { status: 200 },
      )
    }) as unknown as typeof fetch
    const skill = await fetchAgentSkill('legal-contract-reviewer', fetchImpl)
    expect(skill?.systemPrompt).toBe('You review contracts.')
  })

  it('returns null for a tool-composing agent (skill: null) with no inline prompt', async () => {
    const { fetchAgentSkill } = await import('../src/registry-fetch')
    const fetchImpl = (async (url: string) => {
      if (new URL(url).hostname === 'registry.agentskit.io')
        return new Response(JSON.stringify({ skill: null }), { status: 200 })
      if (url.endsWith('meta.json')) return new Response(JSON.stringify({ description: 'd' }), { status: 200 })
      return new Response('import { researcher } from "@agentskit/skills"', { status: 200 })
    }) as unknown as typeof fetch
    const skill = await fetchAgentSkill('research', fetchImpl)
    expect(skill).toBeNull()
  })
})
