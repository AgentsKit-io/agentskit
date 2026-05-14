/**
 * Extended MCP client tests — covers the uncovered branches:
 *   bridge.ts lines 30-33 (server startup failure)
 *   client.ts lines 86-94 (request on disposed/not-started client),
 *              lines 100-101 (response with error),
 *              line 126 (onStdout parse error)
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { McpClient } from '../src/extensibility/mcp/client'
import { bridgeMcpServers, disposeMcpClients } from '../src/extensibility/mcp'

afterEach(() => {
  vi.restoreAllMocks()
})

// Inline script that sends an error response
const ERROR_SERVER_SRC = `
const rl = require('readline').createInterface({ input: process.stdin })
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\\n') }
rl.on('line', (line) => {
  let msg
  try { msg = JSON.parse(line) } catch { return }
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { serverInfo: { name: 'error-server' } } })
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: [] } })
  } else if (msg.method === 'tools/call') {
    send({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'tool failed' } })
  }
})
`

// Server that sends malformed JSON then a valid response
const MALFORMED_SERVER_SRC = `
const rl = require('readline').createInterface({ input: process.stdin })
let first = true
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\\n') }
rl.on('line', (line) => {
  let msg
  try { msg = JSON.parse(line) } catch { return }
  if (msg.method === 'initialize') {
    if (first) {
      first = false
      // send malformed then valid
      process.stdout.write('not-valid-json\\n')
      send({ jsonrpc: '2.0', id: msg.id, result: { serverInfo: { name: 'malformed' } } })
    }
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: [] } })
  }
})
`

describe('McpClient — request on non-started client', () => {
  it('rejects immediately when client not started', async () => {
    const client = new McpClient({
      name: 'not-started',
      command: 'echo',
      args: ['noop'],
    })
    // We call listTools without calling start() — triggers the not-running guard
    await expect(client.listTools()).rejects.toThrow(/not running/)
    client.dispose()
  })

  it('dispose is idempotent (second call is a no-op)', async () => {
    // Use the fake server that properly responds to initialize
    const FAKE_SERVER_SRC = `
const rl = require('readline').createInterface({ input: process.stdin })
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\\n') }
rl.on('line', (line) => {
  let msg
  try { msg = JSON.parse(line) } catch { return }
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { serverInfo: { name: 'fake' } } })
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: [] } })
  }
})
`
    const client = new McpClient({
      name: 'idempotent',
      command: process.execPath,
      args: ['-e', FAKE_SERVER_SRC],
      timeout: 3000,
    })
    await client.start()
    client.dispose()
    expect(() => client.dispose()).not.toThrow()
  }, 10_000)
})

describe('McpClient — response with error field', () => {
  it('rejects callTool when server returns error response', async () => {
    const client = new McpClient({
      name: 'error-srv',
      command: process.execPath,
      args: ['-e', ERROR_SERVER_SRC],
      timeout: 5000,
    })
    try {
      await client.start()
      const tools = await client.listTools()
      expect(tools).toEqual([])
      // Now call a tool — server returns error response
      await expect(client.callTool('any', {})).rejects.toThrow('tool failed')
    } finally {
      client.dispose()
    }
  }, 10_000)
})

describe('McpClient — onStdout parse error', () => {
  it('calls onError for malformed JSON lines without crashing', async () => {
    const errors: unknown[] = []
    const client = new McpClient(
      {
        name: 'malformed-srv',
        command: process.execPath,
        args: ['-e', MALFORMED_SERVER_SRC],
        timeout: 5000,
      },
      (err) => errors.push(err),
    )
    try {
      await client.start()
      // The malformed line should have triggered onError
      expect(errors.length).toBeGreaterThanOrEqual(1)
    } finally {
      client.dispose()
    }
  }, 10_000)
})

describe('bridgeMcpServers — server startup failure', () => {
  it('logs and continues when a server fails to start', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const bundle = await bridgeMcpServers([
      {
        name: 'bad-server',
        command: 'this-command-does-not-exist-9999',
        args: [],
        timeout: 2000,
      },
    ])

    // Should still return an empty bundle rather than throwing
    expect(bundle.tools).toEqual([])
    expect(bundle.clients).toEqual([])
    const stderrOutput = stderrSpy.mock.calls.map(c => c[0] as string).join('')
    expect(stderrOutput).toContain('bad-server')
  }, 10_000)

  it('disposeMcpClients calls dispose on all clients', async () => {
    const disposeA = vi.fn()
    const disposeB = vi.fn()
    const fakeClients = [{ dispose: disposeA }, { dispose: disposeB }] as unknown as import('../src/extensibility/mcp/client').McpClient[]
    disposeMcpClients(fakeClients)
    expect(disposeA).toHaveBeenCalledOnce()
    expect(disposeB).toHaveBeenCalledOnce()
  })
})
