import type { ToolDefinition } from '@agentskit/core'
import { createInMemoryTransportPair, createMcpClient } from '@agentskit/tools/mcp'
import { createAgentsKitMcpServer } from '../src/index'

const command = 'npx'
const args = ['-y', '@agentskit/mcp@0.3.3', '--tools', 'fetch,search'] as const

const stdioServer = { type: 'stdio', command, args } as const
const desktopStdioServer = { command, args } as const

export const codingAgentHostConfigs = {
  claude: {
    cli: 'claude mcp add --scope project --transport stdio agentskit -- npx -y @agentskit/mcp@0.3.3 --tools fetch,search',
    config: {
      mcpServers: {
        agentskit: stdioServer,
      },
    },
    path: '.mcp.json',
  },
  claudeDesktop: {
    config: {
      mcpServers: {
        agentskit: desktopStdioServer,
      },
    },
    paths: {
      macos: '~/Library/Application Support/Claude/claude_desktop_config.json',
      windows: '%APPDATA%\\Claude\\claude_desktop_config.json',
    },
  },
  codex: {
    cli: 'codex mcp add agentskit -- npx -y @agentskit/mcp@0.3.3 --tools fetch,search',
    config: [
      '[mcp_servers.agentskit]',
      `command = "${command}"`,
      `args = [${args.map((arg) => `"${arg}"`).join(', ')}]`,
      'default_tools_approval_mode = "prompt"',
    ].join('\n'),
    path: '.codex/config.toml',
  },
  cursor: {
    config: {
      mcpServers: {
        agentskit: stdioServer,
      },
    },
    path: '.cursor/mcp.json',
  },
  cline: {
    config: {
      mcpServers: {
        agentskit: {
          ...desktopStdioServer,
          env: {},
          disabled: false,
          autoApprove: [],
        },
      },
    },
    configureWith: 'MCP Servers > Configure MCP Servers',
  },
  continue: {
    config: [
      'name: AgentsKit MCP',
      'version: 0.3.3',
      'schema: v1',
      'mcpServers:',
      '  - name: agentskit',
      '    type: stdio',
      `    command: ${command}`,
      '    args:',
      ...args.map((arg) => `      - "${arg}"`),
    ].join('\n'),
    path: '.continue/mcpServers/agentskit.yaml',
  },
  generic: {
    config: {
      mcpServers: {
        agentskit: stdioServer,
      },
    },
  },
} as const

const echoTool: ToolDefinition = {
  name: 'agentskit_echo',
  description: 'Return a bounded text value to prove the MCP host path.',
  schema: {
    type: 'object',
    properties: { text: { type: 'string', maxLength: 80 } },
    required: ['text'],
  },
  execute: async ({ text }) => `AgentsKit MCP received: ${String(text).slice(0, 80)}`,
}

export const verifyMcpProtocol = async (): Promise<string | null> => {
  const [clientTransport, serverTransport] = createInMemoryTransportPair()
  const server = createAgentsKitMcpServer({ tools: [echoTool], transport: serverTransport })
  const client = createMcpClient({ transport: clientTransport })

  try {
    const initialized = await client.initialize()
    const listed = await client.listTools()
    const called = await client.callTool('agentskit_echo', { text: 'portable host proof' })
    const toolNames = listed.tools.map((tool) => tool.name)
    const result = called.content[0]?.text
    if (initialized.serverInfo.name !== 'agentskit-mcp' || !toolNames.includes('agentskit_echo')) {
      return null
    }
    if (result !== 'AgentsKit MCP received: portable host proof') {
      return null
    }
    return 'verified in-memory MCP protocol; tool: agentskit_echo'
  } finally {
    await client.close()
    await server.close()
  }
}
