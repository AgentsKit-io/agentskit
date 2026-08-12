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

const expectedHostArgs = ['-y', '@agentskit/mcp@0.3.3', '--tools', 'fetch,search']
const expectedClaudeCli = 'claude mcp add --scope project --transport stdio agentskit -- npx -y @agentskit/mcp@0.3.3 --tools fetch,search'
const expectedCodexCli = 'codex mcp add agentskit -- npx -y @agentskit/mcp@0.3.3 --tools fetch,search'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requireValue = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`invalid coding-agent host config: ${message}`)
}

const readJsonServer = (value: unknown, host: string): Record<string, unknown> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(JSON.stringify(value)) as unknown
  } catch {
    throw new Error(`invalid coding-agent host config: ${host} is not JSON-serializable`)
  }
  requireValue(isRecord(parsed), `${host} must be a JSON object`)
  const servers = parsed.mcpServers
  requireValue(isRecord(servers), `${host}.mcpServers must be an object`)
  const server = servers.agentskit
  requireValue(isRecord(server), `${host}.mcpServers.agentskit must be an object`)
  return server
}

const validateStdioServer = (server: Record<string, unknown>, host: string, explicitType: boolean): void => {
  for (const key of ['url', 'headers', 'transportType', 'sse', 'streamableHttp']) {
    requireValue(!(key in server), `${host}.${key} must not configure a remote transport`)
  }
  requireValue(
    explicitType ? server.type === 'stdio' : server.type === undefined || server.type === 'stdio',
    `${host}.type must be absent or "stdio"`,
  )
  requireValue(server.command === command, `${host}.command must be "${command}"`)
  requireValue(
    Array.isArray(server.args) && server.args.every((arg): arg is string => typeof arg === 'string')
      && JSON.stringify(server.args) === JSON.stringify(expectedHostArgs),
    `${host}.args must pin @agentskit/mcp@0.3.3 with fetch,search`,
  )
}

const parseCodexToml = (source: string): Record<string, unknown> => {
  const lines = source.split('\n').map((line) => line.trim()).filter(Boolean)
  requireValue(lines[0] === '[mcp_servers.agentskit]', 'Codex TOML section is missing')
  const values: Record<string, unknown> = {}
  const seen = new Set<string>()
  const parseStringArray = (sourceValue: string): string[] => {
    const parsed: string[] = []
    let index = 0
    while (index < sourceValue.length) {
      while (/\s/.test(sourceValue[index] ?? '')) index += 1
      requireValue(sourceValue[index] === '"', 'Codex args must be quoted TOML strings')
      index += 1
      let value = ''
      while (index < sourceValue.length && sourceValue[index] !== '"') {
        requireValue(sourceValue[index] !== '\\', 'Codex args must not contain unsupported escapes')
        value += sourceValue[index]
        index += 1
      }
      requireValue(sourceValue[index] === '"', 'Codex args must close every string')
      parsed.push(value)
      index += 1
      while (/\s/.test(sourceValue[index] ?? '')) index += 1
      if (index === sourceValue.length) break
      requireValue(sourceValue[index] === ',', 'Codex args must separate TOML strings with commas')
      index += 1
      while (/\s/.test(sourceValue[index] ?? '')) index += 1
      requireValue(index < sourceValue.length, 'Codex args must not end with a comma')
    }
    return parsed
  }
  for (const line of lines.slice(1)) {
    const stringMatch = /^(command|default_tools_approval_mode) = "([^"]*)"$/.exec(line)
    if (stringMatch) {
      requireValue(!seen.has(stringMatch[1]), `Codex TOML key ${stringMatch[1]} is duplicated`)
      seen.add(stringMatch[1])
      values[stringMatch[1]] = stringMatch[2]
      continue
    }
    const argsMatch = /^args = \[(.*)\]$/.exec(line)
    if (argsMatch) {
      requireValue(!seen.has('args'), 'Codex TOML key args is duplicated')
      seen.add('args')
      values.args = parseStringArray(argsMatch[1])
      continue
    }
    throw new Error(`invalid coding-agent host config: unsupported Codex TOML line ${line}`)
  }
  return values
}

const validateContinueYaml = (source: string): void => {
  const lines = source.split('\n')
  const metadata = [
    'name: AgentsKit MCP',
    'version: 0.3.3',
    'schema: v1',
    'mcpServers:',
    '  - name: agentskit',
    '    type: stdio',
    '    command: npx',
    '    args:',
  ]
  requireValue(lines.length === metadata.length + expectedHostArgs.length, 'Continue YAML line count changed')
  for (const [index, line] of metadata.entries()) {
    requireValue(lines[index] === line, `Continue YAML metadata line ${index + 1} is invalid`)
  }
  const parsedArgs = lines.slice(metadata.length).map((line, index) => {
    const match = /^      - "([^"]*)"$/.exec(line)
    requireValue(match !== null, `Continue YAML arg line ${index + 1} is invalid`)
    return match[1]
  })
  requireValue(JSON.stringify(parsedArgs) === JSON.stringify(expectedHostArgs), 'Continue YAML args are invalid')
}

export const validateCodingAgentHostConfigs = (configs: unknown = codingAgentHostConfigs): void => {
  requireValue(isRecord(configs), 'root must be an object')

  for (const host of ['claude', 'cursor', 'generic'] as const) {
    const hostConfig = configs[host]
    requireValue(isRecord(hostConfig), `${host} must be an object`)
    validateStdioServer(readJsonServer(hostConfig.config ?? null, host), host, true)
  }

  const claudeDesktop = configs.claudeDesktop
  requireValue(isRecord(claudeDesktop), 'claudeDesktop must be an object')
  validateStdioServer(
    readJsonServer(claudeDesktop.config ?? null, 'claudeDesktop'),
    'claudeDesktop',
    false,
  )

  const clineConfig = configs.cline
  requireValue(isRecord(clineConfig), 'cline must be an object')
  const cline = readJsonServer(clineConfig.config ?? null, 'cline')
  validateStdioServer(cline, 'cline', false)
  requireValue(isRecord(cline.env) && Object.keys(cline.env).length === 0, 'cline.env must stay empty')
  requireValue(Array.isArray(cline.autoApprove) && cline.autoApprove.length === 0, 'cline.autoApprove must stay empty')
  requireValue(cline.disabled === false, 'cline.disabled must stay false')

  const codex = configs.codex
  requireValue(isRecord(codex) && typeof codex.config === 'string', 'codex.config must be TOML text')
  requireValue(codex.cli === expectedCodexCli, 'Codex CLI command must remain version-pinned')
  const codexToml = parseCodexToml(codex.config)
  requireValue(codexToml.command === command, 'Codex command must be "npx"')
  requireValue(JSON.stringify(codexToml.args) === JSON.stringify(expectedHostArgs), 'Codex args are invalid')
  requireValue(codexToml.default_tools_approval_mode === 'prompt', 'Codex approval must remain prompt')

  const continueConfig = configs.continue
  requireValue(isRecord(continueConfig) && typeof continueConfig.config === 'string', 'continue.config must be YAML text')
  validateContinueYaml(continueConfig.config)

  const claude = configs.claude
  requireValue(isRecord(claude) && claude.cli === expectedClaudeCli, 'Claude CLI command must remain version-pinned')
}

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
