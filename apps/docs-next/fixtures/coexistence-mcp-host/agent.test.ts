import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { startServer } from './agent'

describe('coexistence-mcp-host fixture', () => {
  it('lists and calls AgentsKit tools from the official MCP SDK client', async () => {
    const { server, hostTransport } = startServer()
    const client = new Client({ name: 'external-host', version: '1.0.0' })
    await client.connect(hostTransport)

    const listed = await client.listTools()
    expect(listed.tools.map(tool => tool.name)).toEqual(['add', 'explode'])

    const sum = await client.callTool({ name: 'add', arguments: { a: 2, b: 3 } })
    expect(sum.isError).toBeFalsy()
    expect(sum.content).toEqual([{ type: 'text', text: '5' }])

    const failed = await client.callTool({ name: 'explode', arguments: {} })
    expect(failed.isError).toBe(true)
    expect(failed.content).toEqual([{ type: 'text', text: 'tool execution failed' }])

    await client.close()
    await server.close()
  })
})
