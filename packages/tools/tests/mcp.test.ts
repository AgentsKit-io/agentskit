import { describe, expect, it, vi } from 'vitest'
import type { ToolDefinition } from '@agentskit/core'
import {
  createInMemoryTransportPair,
  createMcpClient,
  createMcpServer,
  createStdioTransport,
  toolsFromMcpClient,
  type JsonRpcMessage,
  type McpTransport,
} from '../src/mcp'

function makeTool(name: string, run: (args: Record<string, unknown>) => unknown | Promise<unknown>): ToolDefinition {
  return {
    name,
    description: `desc-${name}`,
    schema: { type: 'object', properties: { q: { type: 'string' } } },
    execute: async args => run(args),
  }
}

describe('MCP bridge (client ↔ server over in-memory transport)', () => {
  it('initialize returns server info', async () => {
    const [a, b] = createInMemoryTransportPair()
    const server = createMcpServer({ transport: b, tools: [] })
    const client = createMcpClient({ transport: a })
    const info = await client.initialize()
    expect(info.serverInfo.name).toBe('agentskit-mcp-server')
    await server.close()
    await client.close()
  })

  it('lists exposed tools with their schemas', async () => {
    const [a, b] = createInMemoryTransportPair()
    const tools = [makeTool('echo', async args => `hi ${args.q}`)]
    createMcpServer({ transport: b, tools })
    const client = createMcpClient({ transport: a })
    const result = await client.listTools()
    expect(result.tools.map(t => t.name)).toEqual(['echo'])
    expect(result.tools[0]!.inputSchema.properties).toBeDefined()
    await client.close()
  })

  it('callTool invokes the server-side execute', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({ transport: b, tools: [makeTool('echo', async ({ q }) => `you said ${q}`)] })
    const client = createMcpClient({ transport: a })
    const result = await client.callTool('echo', { q: 'hi' })
    expect(result.content[0]!.type).toBe('text')
    expect(result.content[0]!.text).toBe('you said hi')
    expect(result.isError).toBeUndefined()
    await client.close()
  })

  it('returns isError: true when the tool throws', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({
      transport: b,
      tools: [{ name: 'boom', description: '', execute: async () => { throw new Error('bang') } }],
    })
    const client = createMcpClient({ transport: a })
    const result = await client.callTool('boom', {})
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toBe('bang')
    await client.close()
  })

  it('errors on unknown tool', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({ transport: b, tools: [] })
    const client = createMcpClient({ transport: a })
    await expect(client.callTool('missing', {})).rejects.toThrow(/unknown tool/)
    await client.close()
  })

  it('errors on unknown method', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({ transport: b, tools: [] })
    const client = createMcpClient({ transport: a })
    // Call into the private transport to test the method-not-found branch.
    const send = (msg: JsonRpcMessage): void => {
      void a.send(msg)
    }
    const received = new Promise<JsonRpcMessage>(resolve => {
      a.onMessage(resolve)
    })
    send({ jsonrpc: '2.0', id: 99, method: 'nonsense' })
    const response = await received
    expect('error' in response && response.error.code).toBe(-32601)
    await client.close()
  })

  it('onEvent observer fires for list / call / error', async () => {
    const events: string[] = []
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({
      transport: b,
      tools: [makeTool('echo', async () => 'ok')],
      onEvent: e => events.push(`${e.type}:${e.tool ?? ''}`),
    })
    const client = createMcpClient({ transport: a })
    await client.listTools()
    await client.callTool('echo', {})
    await client.callTool('missing', {}).catch(() => undefined)
    expect(events).toEqual(['list:', 'call:echo', 'error:missing'])
    await client.close()
  })

  it('non-text results are serialized to JSON text', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({
      transport: b,
      tools: [makeTool('obj', async () => ({ k: 1, arr: [1, 2] }))],
    })
    const client = createMcpClient({ transport: a })
    const result = await client.callTool('obj', {})
    expect(result.content[0]!.text).toBe(JSON.stringify({ k: 1, arr: [1, 2] }))
    await client.close()
  })
})

describe('toolsFromMcpClient', () => {
  it('hydrates MCP tools into AgentsKit ToolDefinitions (no quarantine)', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({ transport: b, tools: [makeTool('echo', async ({ q }) => `you said ${q}`)] })
    const client = createMcpClient({ transport: a })
    const tools = await toolsFromMcpClient(client, { quarantine: false })
    expect(tools).toHaveLength(1)
    expect(tools[0]!.name).toBe('echo')
    const out = await tools[0]!.execute!(
      { q: 'hi' },
      { messages: [], call: { id: 'c', name: 'echo', args: { q: 'hi' }, status: 'running' } },
    )
    expect(out).toBe('you said hi')
    await client.close()
  })

  it('quarantines untrusted servers by default: name prefix + provenance hint', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({ transport: b, tools: [makeTool('echo', async ({ q }) => `you said ${q}`)] })
    const client = createMcpClient({ transport: a })
    const tools = await toolsFromMcpClient(client)
    expect(tools[0]!.name).toBe('mcp:echo')
    expect(tools[0]!.description).toMatch(/^\[mcp\]/)
    await client.close()
  })

  it('truncates oversized descriptions to maxDescriptionBytes', async () => {
    const [a, b] = createInMemoryTransportPair()
    const huge = 'x'.repeat(10_000)
    createMcpServer({
      transport: b,
      tools: [{ name: 't', description: huge, execute: async () => 'ok' }],
    })
    const client = createMcpClient({ transport: a })
    const tools = await toolsFromMcpClient(client, { maxDescriptionBytes: 100, quarantine: false })
    expect(tools[0]!.description!.length).toBeLessThanOrEqual(100)
    expect(tools[0]!.description).toContain('[truncated]')
    await client.close()
  })

  it('drops tools whose inputSchema exceeds maxSchemaBytes', async () => {
    const [a, b] = createInMemoryTransportPair()
    const giant: Record<string, { type: string }> = {}
    for (let i = 0; i < 5_000; i++) giant[`p${i}`] = { type: 'string' }
    createMcpServer({
      transport: b,
      tools: [{
        name: 'big',
        description: 'd',
        schema: { type: 'object', properties: giant },
        execute: async () => 'ok',
      }],
    })
    const client = createMcpClient({ transport: a })
    const tools = await toolsFromMcpClient(client, { maxSchemaBytes: 1_000 })
    expect(tools).toHaveLength(0)
    await client.close()
  })

  it('propagates tool errors', async () => {
    const [a, b] = createInMemoryTransportPair()
    createMcpServer({
      transport: b,
      tools: [{ name: 'boom', description: '', execute: async () => { throw new Error('bang') } }],
    })
    const client = createMcpClient({ transport: a })
    const tools = await toolsFromMcpClient(client, { quarantine: false })
    await expect(
      tools[0]!.execute!({}, { messages: [], call: { id: 'c', name: 'boom', args: {}, status: 'running' } }),
    ).rejects.toThrow(/bang/)
    await client.close()
  })
})

describe('createStdioTransport', () => {
  it('frames newline-delimited JSON on stdin/stdout', () => {
    const writes: string[] = []
    let dataCb: ((chunk: Buffer | string) => void) | undefined
    const child = {
      stdin: { write: (chunk: string) => { writes.push(chunk); return true } },
      stdout: {
        on: (_event: 'data', cb: (chunk: Buffer | string) => void) => {
          dataCb = cb
        },
      },
    }
    const transport: McpTransport = createStdioTransport(child)
    const received: JsonRpcMessage[] = []
    transport.onMessage(m => received.push(m))

    transport.send({ jsonrpc: '2.0', id: 1, method: 'initialize' })
    expect(writes[0]).toBe(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })}\n`)

    dataCb!(`${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } })}\n`)
    expect(received[0]).toMatchObject({ result: { ok: true } })
  })

  it('buffers partial chunks until newline arrives', () => {
    let dataCb: ((chunk: Buffer | string) => void) | undefined
    const child = {
      stdin: { write: (_chunk: string) => true },
      stdout: {
        on: (_event: 'data', cb: (chunk: Buffer | string) => void) => {
          dataCb = cb
        },
      },
    }
    const transport = createStdioTransport(child)
    const received: JsonRpcMessage[] = []
    transport.onMessage(m => received.push(m))
    dataCb!('{"jsonrpc":"2.0","id":1,')
    expect(received).toHaveLength(0)
    dataCb!('"result":{}}\n')
    expect(received).toHaveLength(1)
  })

  it('ignores malformed JSON frames', () => {
    let dataCb: ((chunk: Buffer | string) => void) | undefined
    const child = {
      stdin: { write: vi.fn() },
      stdout: {
        on: (_event: 'data', cb: (chunk: Buffer | string) => void) => {
          dataCb = cb
        },
      },
    }
    const transport = createStdioTransport(child)
    const received: JsonRpcMessage[] = []
    transport.onMessage(m => received.push(m))
    dataCb!('not-json\n')
    expect(received).toHaveLength(0)
  })

  it('exposes detach functions for onMessage / onClose and supports close()', () => {
    let dataCb: ((chunk: Buffer | string) => void) | undefined
    const off = vi.fn()
    const kill = vi.fn()
    const child = {
      stdin: { write: vi.fn() },
      stdout: {
        on: (_event: 'data', cb: (chunk: Buffer | string) => void) => {
          dataCb = cb
        },
        off,
      },
      kill,
    }
    const transport = createStdioTransport(child)
    const msgs: JsonRpcMessage[] = []
    const detachMsg = transport.onMessage(m => msgs.push(m))
    let closed = false
    const detachClose = transport.onClose(() => { closed = true })
    detachMsg()
    detachClose()
    // After detach, no further callbacks fire.
    dataCb!('{"jsonrpc":"2.0","id":1,"result":1}\n')
    expect(msgs).toHaveLength(0)
    transport.close()
    expect(off).toHaveBeenCalledWith('data', expect.any(Function))
    expect(kill).toHaveBeenCalled()
    expect(closed).toBe(false)
  })

  it('in-memory transport detach removes message + close listeners', () => {
    const [a, b] = createInMemoryTransportPair()
    const msgs: JsonRpcMessage[] = []
    let closed = false
    const offMsg = a.onMessage(m => msgs.push(m))
    const offClose = a.onClose(() => { closed = true })
    offMsg()
    offClose()
    b.send({ jsonrpc: '2.0', id: 1, method: 'x' })
    expect(msgs).toHaveLength(0)
    b.close?.()
    expect(closed).toBe(false)
  })

  it('kills child and fires onClose when frame exceeds maxFrameBytes', () => {
    let dataCb: ((chunk: Buffer | string) => void) | undefined
    const kill = vi.fn()
    const child = {
      stdin: { write: vi.fn() },
      stdout: {
        on: (_event: 'data', cb: (chunk: Buffer | string) => void) => {
          dataCb = cb
        },
      },
      kill,
    }
    const transport = createStdioTransport(child, { maxFrameBytes: 32 })
    let closed = false
    transport.onClose(() => { closed = true })
    dataCb!('x'.repeat(100))
    expect(kill).toHaveBeenCalled()
    expect(closed).toBe(true)
  })
})

describe('MCP client request bounds', () => {
  it('rejects per-request after requestTimeoutMs', async () => {
    vi.useFakeTimers()
    try {
      const [a, b] = createInMemoryTransportPair()
      // Drop messages on the server side — never reply.
      b.onMessage(() => {})
      const client = createMcpClient({ transport: a, requestTimeoutMs: 100 })
      const promise = client.listTools()
      vi.advanceTimersByTime(200)
      await expect(promise).rejects.toThrow(/timeout/)
      await client.close()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects new calls once maxPending is reached', async () => {
    const [a, b] = createInMemoryTransportPair()
    b.onMessage(() => {})
    const client = createMcpClient({ transport: a, maxPending: 2, requestTimeoutMs: 60_000 })
    const p1 = client.listTools().catch(() => undefined)
    const p2 = client.listTools().catch(() => undefined)
    await expect(client.listTools()).rejects.toThrow(/maxPending/)
    await client.close()
    await Promise.all([p1, p2])
  })

  it('close() rejects all in-flight calls', async () => {
    const [a, b] = createInMemoryTransportPair()
    b.onMessage(() => {})
    const client = createMcpClient({ transport: a, requestTimeoutMs: 60_000 })
    const p = client.listTools()
    await client.close()
    await expect(p).rejects.toThrow(/closed/)
  })
})
