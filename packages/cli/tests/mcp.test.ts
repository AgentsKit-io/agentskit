import { describe, expect, it } from 'vitest'
import { bridgeMcpServers, McpClient, disposeMcpClients } from '../src/extensibility/mcp'

/**
 * Fake MCP server (inline node process): answers `initialize` + `tools/list`
 * + `tools/call` with predictable output. Line-delimited JSON-RPC.
 */
const FAKE_SERVER_SRC = `
const rl = require('readline').createInterface({ input: process.stdin })
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\\n') }
rl.on('line', (line) => {
  let msg
  try { msg = JSON.parse(line) } catch { return }
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { serverInfo: { name: 'fake' } } })
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'echo', description: 'echo back', inputSchema: { type: 'object' } }] } })
  } else if (msg.method === 'tools/call') {
    send({ jsonrpc: '2.0', id: msg.id, result: { echoed: msg.params.arguments } })
  }
})
`

describe('McpClient', () => {
  it('initializes + lists + calls a fake server', async () => {
    const client = new McpClient({
      name: 'fake',
      command: process.execPath,
      args: ['-e', FAKE_SERVER_SRC],
      timeout: 3000,
    })
    try {
      await client.start()
      const tools = await client.listTools()
      expect(tools).toHaveLength(1)
      expect(tools[0]!.name).toBe('echo')
      const result = await client.callTool('echo', { hello: 'world' })
      expect(result).toEqual({ echoed: { hello: 'world' } })
    } finally {
      client.dispose()
    }
  }, 10_000)
})

describe('bridgeMcpServers', () => {
  it('returns empty bundle when no specs', async () => {
    const bundle = await bridgeMcpServers([])
    expect(bundle.tools).toEqual([])
    expect(bundle.clients).toEqual([])
  })

  it('bridges fake server tools as prefixed ToolDefinitions', async () => {
    const bundle = await bridgeMcpServers([
      {
        name: 'fake',
        command: process.execPath,
        args: ['-e', FAKE_SERVER_SRC],
        timeout: 3000,
      },
    ])
    try {
      expect(bundle.tools.map(t => t.name)).toEqual(['fake__echo'])
      const result = await bundle.tools[0]!.execute({ a: 1 }, {} as never)
      expect(result).toEqual({ echoed: { a: 1 } })
    } finally {
      disposeMcpClients(bundle.clients)
    }
  }, 10_000)
})
