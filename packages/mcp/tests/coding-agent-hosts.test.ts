import { describe, expect, it } from 'vitest'
import {
  codingAgentHostConfigs,
  validateCodingAgentHostConfigs,
  verifyMcpProtocol,
} from '../fixtures/coding-agent-hosts'

const expectedArgs = ['-y', '@agentskit/mcp@0.4.2', '--tools', 'fetch,search']

describe('coding-agent MCP host recipe', () => {
  it('validates every JSON, TOML, and YAML wrapper', () => {
    expect(() => validateCodingAgentHostConfigs()).not.toThrow()
  })

  it('rejects a malformed wrapper instead of treating protocol proof as host proof', () => {
    const invalid = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const continueConfig = invalid.continue as Record<string, unknown>
    continueConfig.config = String(continueConfig.config).replace('command: npx', 'command:')

    expect(() => validateCodingAgentHostConfigs(invalid)).toThrow(/Continue YAML metadata line 7/)
  })

  it('rejects malformed JSON and TOML wrappers independently', () => {
    const invalidJson = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const cursor = invalidJson.cursor as Record<string, unknown>
    const cursorConfig = cursor.config as Record<string, unknown>
    delete cursorConfig.mcpServers
    expect(() => validateCodingAgentHostConfigs(invalidJson)).toThrow(/cursor\.mcpServers/)

    const invalidToml = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const codex = invalidToml.codex as Record<string, unknown>
    codex.config = String(codex.config).replace('"fetch,search"', 'fetch,search')
    expect(() => validateCodingAgentHostConfigs(invalidToml)).toThrow(/Codex args must be quoted TOML strings/)

    const missingComma = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const missingCommaCodex = missingComma.codex as Record<string, unknown>
    missingCommaCodex.config = String(missingCommaCodex.config).replace('"-y", "@agentskit', '"-y" "@agentskit')
    expect(() => validateCodingAgentHostConfigs(missingComma)).toThrow(/separate TOML strings with commas/)

    const duplicateKey = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const duplicateCodex = duplicateKey.codex as Record<string, unknown>
    duplicateCodex.config = `${duplicateCodex.config}\ncommand = "npx"`
    expect(() => validateCodingAgentHostConfigs(duplicateKey)).toThrow(/Codex TOML key command is duplicated/)

    const unknownHost = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    unknownHost.neovim = { config: {} }
    expect(() => validateCodingAgentHostConfigs(unknownHost)).toThrow(/root hosts must be exactly/)

    const missingHost = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    delete missingHost.continue
    expect(() => validateCodingAgentHostConfigs(missingHost)).toThrow(/root hosts must be exactly/)
  })

  it('rejects non-stdio transports, Cline env values, and drifting CLI commands', () => {
    const wrongType = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const desktop = wrongType.claudeDesktop as Record<string, unknown>
    const desktopServer = (desktop.config as Record<string, unknown>).mcpServers as Record<string, unknown>
    ;(desktopServer.agentskit as Record<string, unknown>).type = 'streamable-http'
    expect(() => validateCodingAgentHostConfigs(wrongType)).toThrow(/claudeDesktop.type must be absent or "stdio"/)

    const remoteField = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const remoteDesktop = remoteField.claudeDesktop as Record<string, unknown>
    const remoteServer = (remoteDesktop.config as Record<string, unknown>).mcpServers as Record<string, unknown>
    ;(remoteServer.agentskit as Record<string, unknown>).url = 'https://example.invalid/mcp'
    expect(() => validateCodingAgentHostConfigs(remoteField)).toThrow(/claudeDesktop.url must not configure a remote transport/)

    const credentialField = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const claude = credentialField.claude as Record<string, unknown>
    const claudeServer = (claude.config as Record<string, unknown>).mcpServers as Record<string, unknown>
    ;(claudeServer.agentskit as Record<string, unknown>).env = { API_KEY: 'secret' }
    expect(() => validateCodingAgentHostConfigs(credentialField)).toThrow(/claude.env is not part of the pinned wrapper/)

    const unknownField = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const cursor = unknownField.cursor as Record<string, unknown>
    const cursorServer = (cursor.config as Record<string, unknown>).mcpServers as Record<string, unknown>
    ;(cursorServer.agentskit as Record<string, unknown>).timeout = 30_000
    expect(() => validateCodingAgentHostConfigs(unknownField)).toThrow(/cursor.timeout is not part of the pinned wrapper/)

    const extraServer = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const extraCursor = extraServer.cursor as Record<string, unknown>
    const extraServers = (extraCursor.config as Record<string, unknown>).mcpServers as Record<string, unknown>
    extraServers.other = { command: 'npx', args: [] }
    expect(() => validateCodingAgentHostConfigs(extraServer)).toThrow(/cursor.mcpServers must contain only agentskit/)

    const extraRoot = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const extraRootCursor = extraRoot.cursor as Record<string, unknown>
    ;(extraRootCursor.config as Record<string, unknown>).metadata = 'unexpected'
    expect(() => validateCodingAgentHostConfigs(extraRoot)).toThrow(/cursor must contain only mcpServers/)

    const legacyTransport = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const legacyCline = legacyTransport.cline as Record<string, unknown>
    const legacyServer = (legacyCline.config as Record<string, unknown>).mcpServers as Record<string, unknown>
    ;(legacyServer.agentskit as Record<string, unknown>).transportType = 'sse'
    expect(() => validateCodingAgentHostConfigs(legacyTransport)).toThrow(/cline.transportType must not configure a remote transport/)

    const envValue = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const cline = envValue.cline as Record<string, unknown>
    const clineServer = (cline.config as Record<string, unknown>).mcpServers as Record<string, unknown>
    ;(clineServer.agentskit as Record<string, unknown>).env = { API_KEY: 'secret' }
    expect(() => validateCodingAgentHostConfigs(envValue)).toThrow(/cline.env must stay empty/)

    const driftingCli = JSON.parse(JSON.stringify(codingAgentHostConfigs)) as Record<string, unknown>
    const codex = driftingCli.codex as Record<string, unknown>
    codex.cli = String(codex.cli).replace('@agentskit/mcp@0.4.2', '@agentskit/mcp')
    expect(() => validateCodingAgentHostConfigs(driftingCli)).toThrow(/Codex CLI command must remain version-pinned/)
  })

  it('keeps every host on one safe stdio command', () => {
    for (const host of ['claude', 'cursor', 'generic'] as const) {
      const server = codingAgentHostConfigs[host].config.mcpServers.agentskit
      expect(server).toEqual({ type: 'stdio', command: 'npx', args: expectedArgs })
      expect(server.args).not.toContain('--allow-shell')
      expect(server.args).not.toContain('--api-key')
      expect(server.args).not.toContain('--fs-root')
    }

    for (const host of ['claudeDesktop', 'cline'] as const) {
      const server = codingAgentHostConfigs[host].config.mcpServers.agentskit
      expect(server.command).toBe('npx')
      expect(server.args).toEqual(expectedArgs)
      expect(server.args).not.toContain('--allow-shell')
      expect(server.args).not.toContain('--api-key')
      expect(server.args).not.toContain('--fs-root')
    }

    expect(codingAgentHostConfigs.cline.config.mcpServers.agentskit.autoApprove).toEqual([])
    expect(codingAgentHostConfigs.continue.config).toContain('type: stdio')
    expect(codingAgentHostConfigs.continue.config).toContain('command: npx')
    for (const arg of expectedArgs) {
      expect(codingAgentHostConfigs.continue.config).toContain(`- "${arg}"`)
    }

    expect(codingAgentHostConfigs.codex.config).toContain('[mcp_servers.agentskit]')
    expect(codingAgentHostConfigs.codex.config).toContain('command = "npx"')
    expect(codingAgentHostConfigs.codex.config).toContain('default_tools_approval_mode = "prompt"')
    for (const arg of expectedArgs) expect(codingAgentHostConfigs.codex.config).toContain(`"${arg}"`)
  })

  it('uses the official project-scoped paths and CLI separators', () => {
    expect(codingAgentHostConfigs.codex.path).toBe('.codex/config.toml')
    expect(codingAgentHostConfigs.claude.path).toBe('.mcp.json')
    expect(codingAgentHostConfigs.cursor.path).toBe('.cursor/mcp.json')
    expect(codingAgentHostConfigs.claudeDesktop.paths.macos).toContain('claude_desktop_config.json')
    expect(codingAgentHostConfigs.claudeDesktop.paths.windows).toContain('claude_desktop_config.json')
    expect(codingAgentHostConfigs.cline.configureWith).toBe('MCP Servers > Configure MCP Servers')
    expect(codingAgentHostConfigs.continue.path).toBe('.continue/mcpServers/agentskit.yaml')
    expect(codingAgentHostConfigs.codex.cli).toContain('agentskit -- npx')
    expect(codingAgentHostConfigs.claude.cli).toContain('--scope project --transport stdio agentskit -- npx')
  })

  it('initializes, discovers, and calls an AgentsKit tool without credentials', async () => {
    await expect(verifyMcpProtocol()).resolves.toBe(
      'verified in-memory MCP protocol; tool: agentskit_echo',
    )
  })
})
