import { describe, it, expect, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ErrorCodes, type ToolDefinition } from '@agentskit/core'
import {
  createAgentsKitMcpServer,
  createStreamableHttpHandler,
  type McpAuthIdentity,
  type McpToolExecutionContext,
} from '../src/index'

const echo: ToolDefinition = {
  name: 'echo',
  title: 'Echo',
  description: 'Echo the input text.',
  schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  execute: (args: Record<string, unknown>) => ({ echoed: args.text }),
}

const endpoint = new URL('https://agent.invalid/mcp')

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function fetchFor(handler: (request: Request) => Promise<Response>): FetchLike {
  return async (input, init) => handler(input instanceof Request ? input : new Request(input, init))
}

async function connect(handler: (request: Request) => Promise<Response>, bearer?: string) {
  const transport = new StreamableHTTPClientTransport(endpoint, {
    fetch: fetchFor(handler),
    ...(bearer === undefined ? {} : { requestInit: { headers: { Authorization: `Bearer ${bearer}` } } }),
  })
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  await client.connect(transport)
  return { client, transport }
}

describe('Streamable HTTP', () => {
  it('initializes, lists tools, and calls a tool with a Web Request', async () => {
    const handler = createStreamableHttpHandler({ tools: [echo] })
    const { client } = await connect(handler)

    const list = await client.listTools()
    expect(list.tools.map((tool) => tool.name)).toEqual(['echo'])
    expect(list.tools[0]?.inputSchema).toMatchObject({ type: 'object', required: ['text'] })
    expect(list.tools[0]).toMatchObject({
      title: 'Echo',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    })

    const result = await client.callTool({ name: 'echo', arguments: { text: 'hi' } })
    expect(result.isError).toBeFalsy()
    expect((result.content as Array<{ text?: string }>)[0]?.text).toBe('{"echoed":"hi"}')

    await client.close()
    await handler.close()
  })

  it('reports the negotiated protocol version', async () => {
    const handler = createStreamableHttpHandler({ tools: [echo] })
    const { client } = await connect(handler)
    expect(client.getServerVersion()?.name).toBe('agentskit-mcp')
    await client.close()
    await handler.close()
  })

  it('requires an explicit resource when verifyBearer is set', () => {
    expect(() => createStreamableHttpHandler({
      tools: [echo],
      verifyBearer: () => ({ subject: 'user-1' }),
    })).toThrow(expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }))
  })

  it('requires a resource when metadataPath is set and rejects relative resources', () => {
    expect(() => createStreamableHttpHandler({
      tools: [echo],
      metadataPath: '/.well-known/oauth-protected-resource',
    })).toThrow(expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }))
    expect(() => createStreamableHttpHandler({
      tools: [echo],
      resource: '/mcp',
    })).toThrow(expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }))
  })

  it('points the resource_metadata challenge at the path-suffixed URL', async () => {
    const handler = createStreamableHttpHandler({
      tools: [echo],
      resource: 'https://agent.invalid/mcp',
      verifyBearer: (token) => (token === 'good' ? { subject: 'user-1' } : null),
    })

    const missing = await handler(new Request(endpoint))
    expect(missing.status).toBe(401)
    expect(missing.headers.get('www-authenticate')).toBe(
      'Bearer resource_metadata="https://agent.invalid/.well-known/oauth-protected-resource/mcp"',
    )

    const invalid = new Request(endpoint, { headers: { Authorization: 'Bearer nope' } })
    expect((await handler(invalid)).status).toBe(401)
    await handler.close()
  })

  it('serves protected-resource metadata at the path-suffixed URL', async () => {
    const handler = createStreamableHttpHandler({
      tools: [echo],
      resource: 'https://agent.invalid/mcp',
      authorizationServers: ['https://auth.invalid'],
      scopesSupported: ['tools:read'],
    })
    const response = await handler(
      new Request('https://agent.invalid/.well-known/oauth-protected-resource/mcp'),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      resource: 'https://agent.invalid/mcp',
      authorization_servers: ['https://auth.invalid'],
      scopes_supported: ['tools:read'],
      bearer_methods_supported: ['header'],
    })
    const root = await handler(new Request('https://agent.invalid/.well-known/oauth-protected-resource'))
    expect(root.status).not.toBe(200)
    await handler.close()
  })

  it('uses the root metadata URL when the resource has no path', async () => {
    const handler = createStreamableHttpHandler({
      tools: [echo],
      resource: 'https://agent.invalid',
      verifyBearer: () => null,
    })
    const response = await handler(new Request('https://agent.invalid/.well-known/oauth-protected-resource'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ resource: 'https://agent.invalid' })

    const challenge = await handler(new Request('https://agent.invalid/mcp'))
    expect(challenge.headers.get('www-authenticate')).toBe(
      'Bearer resource_metadata="https://agent.invalid/.well-known/oauth-protected-resource"',
    )
    await handler.close()
  })

  it('honors an explicit metadataPath for serving and the challenge', async () => {
    const handler = createStreamableHttpHandler({
      tools: [echo],
      resource: 'https://agent.invalid/mcp',
      metadataPath: '/.well-known/oauth-protected-resource/custom',
      verifyBearer: () => null,
    })
    const response = await handler(
      new Request('https://agent.invalid/.well-known/oauth-protected-resource/custom'),
    )
    expect(response.status).toBe(200)

    const challenge = await handler(new Request('https://agent.invalid/mcp'))
    expect(challenge.headers.get('www-authenticate')).toBe(
      'Bearer resource_metadata="https://agent.invalid/.well-known/oauth-protected-resource/custom"',
    )
    await handler.close()
  })

  it('does not expose protected-resource metadata without a resource', async () => {
    const handler = createStreamableHttpHandler({ tools: [echo] })
    const response = await handler(new Request('https://agent.invalid/.well-known/oauth-protected-resource'))
    expect(response.status).not.toBe(200)
    await handler.close()
  })

  it('passes the verified identity to tool handlers', async () => {
    const seen: Array<McpAuthIdentity | undefined> = []
    const whoami: ToolDefinition = {
      name: 'whoami',
      execute: (_args, context) => {
        seen.push((context as McpToolExecutionContext).auth)
        return 'ok'
      },
    }
    const handler = createStreamableHttpHandler({
      tools: [whoami],
      resource: 'https://agent.invalid/mcp',
      verifyBearer: (token) => (token === 'good'
        ? { subject: 'user-1', scopes: ['tools:read'], claims: { plan: 'beta' } }
        : null),
    })
    const { client } = await connect(handler, 'good')
    await client.callTool({ name: 'whoami', arguments: {} })
    expect(seen[0]).toEqual({ subject: 'user-1', scopes: ['tools:read'], claims: { plan: 'beta' } })
    await client.close()
    await handler.close()
  })
})

describe('MCP Apps resources', () => {
  it('lists and reads a ui:// resource and links it from a tool', async () => {
    const handler = createStreamableHttpHandler({
      tools: [{ ...echo, app: { resourceUri: 'ui://echo/app.html' } }],
      resources: [{
        uri: 'ui://echo/app.html',
        name: 'Echo app',
        mimeType: 'text/html;profile=mcp-app',
        text: '<!doctype html><title>Echo</title>',
      }],
    })
    const { client } = await connect(handler)

    const tools = await client.listTools()
    expect(tools.tools[0]?._meta).toMatchObject({ ui: { resourceUri: 'ui://echo/app.html' } })

    const resources = await client.listResources()
    expect(resources.resources).toEqual([
      expect.objectContaining({ uri: 'ui://echo/app.html', mimeType: 'text/html;profile=mcp-app' }),
    ])

    const read = await client.readResource({ uri: 'ui://echo/app.html' })
    expect(read.contents[0]).toMatchObject({
      uri: 'ui://echo/app.html',
      mimeType: 'text/html;profile=mcp-app',
      text: '<!doctype html><title>Echo</title>',
    })

    await client.close()
    await handler.close()
  })

  it('denies tools that require confirmation when no authorizer is supplied', async () => {
    const execute = vi.fn(() => 'ran')
    const handler = createStreamableHttpHandler({
      tools: [{ ...echo, requiresConfirmation: true, execute }],
    })
    const { client } = await connect(handler)
    const result = await client.callTool({ name: 'echo', arguments: { text: 'hi' } })
    expect(result.isError).toBe(true)
    expect(execute).not.toHaveBeenCalled()
    await client.close()
    await handler.close()
  })
})

describe('createStreamableHttpHandler server reuse', () => {
  it('reuses an existing server definition', async () => {
    const server = createAgentsKitMcpServer({ tools: [echo] })
    const handler = createStreamableHttpHandler({ server })
    const { client } = await connect(handler)
    expect((await client.listTools()).tools[0]?.name).toBe('echo')
    await client.close()
    await handler.close()
    await server.close()
  })
})
