import { getRegistryIndex, getAgent } from '@/lib/registry'

// MCP endpoint (JSON-RPC 2.0 over POST). Read-only tools over the registry.
export const revalidate = 3600

const SITE = 'https://registry.agentskit.io'
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, mcp-protocol-version',
}

const TOOLS = [
  {
    name: 'list_agents',
    description: 'List all agents in the AgentsKit registry. Optionally filter by category.',
    inputSchema: { type: 'object', properties: { category: { type: 'string' } } },
  },
  {
    name: 'get_agent',
    description: 'Get the full bundle for one agent: metadata, env, skill, and source files.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'search_agents',
    description: 'Search agents by free-text query, category, tag, or runnable flag.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, category: { type: 'string' }, tag: { type: 'string' }, runnable: { type: 'boolean' } },
    },
  },
  {
    name: 'get_install_command',
    description: 'Get the exact install command and a usage snippet for an agent.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
]

const text = (obj: unknown) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] })
const err = (m: string) => ({ isError: true, content: [{ type: 'text', text: m }] })

async function callTool(name: string, args: Record<string, any>) {
  const index = await getRegistryIndex()
  switch (name) {
    case 'list_agents': {
      const list = args.category ? index.filter((a) => a.category === args.category) : index
      return text({ count: list.length, agents: list })
    }
    case 'get_agent': {
      const a = await getAgent(args.id)
      return a ? text(a) : err(`Unknown agent: ${args.id}`)
    }
    case 'search_agents': {
      const q = (args.query ?? '').toLowerCase()
      const res = index.filter((a) => {
        if (args.category && a.category !== args.category) return false
        if (args.tag && !(a.tags ?? []).includes(args.tag)) return false
        if (typeof args.runnable === 'boolean' && (a.runnable ?? false) !== args.runnable) return false
        if (q && !`${a.title} ${a.description} ${a.id}`.toLowerCase().includes(q)) return false
        return true
      })
      return text({ count: res.length, agents: res })
    }
    case 'get_install_command': {
      const a = await getAgent(args.id)
      if (!a) return err(`Unknown agent: ${args.id}`)
      return text({
        install: `npx agentskit add ${args.id}`,
        bundle: `${SITE}/r/${args.id}.json`,
        usage: `import { openai } from '@agentskit/adapters'\nimport { create...Agent } from './agents/${args.id}/agent'`,
      })
    }
    default:
      return err(`Unknown tool: ${name}`)
  }
}

async function handleRpc(msg: any) {
  const { id, method, params } = msg ?? {}
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id, result })
  switch (method) {
    case 'initialize':
      return reply({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'agentskit-registry', version: '1.0.0' } })
    case 'ping':
      return reply({})
    case 'tools/list':
      return reply({ tools: TOOLS })
    case 'tools/call':
      return reply(await callTool(params?.name, params?.arguments ?? {}))
    default:
      if (typeof method === 'string' && method.startsWith('notifications/')) return null
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export function GET() {
  return Response.json(
    { name: 'AgentsKit Registry MCP', transport: 'streamable-http (JSON-RPC over POST)', tools: TOOLS.map((t) => t.name) },
    { headers: CORS },
  )
}

export async function POST(req: Request) {
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: CORS })
  }
  const out = Array.isArray(payload)
    ? (await Promise.all(payload.map(handleRpc))).filter(Boolean)
    : await handleRpc(payload)
  if (out == null || (Array.isArray(out) && out.length === 0)) {
    return new Response(null, { status: 202, headers: CORS })
  }
  return Response.json(out, { headers: CORS })
}
