import { describe, expect, it } from 'vitest'
import { codingAgentHostConfigs, verifyCodingAgentMcp } from '../fixtures/coding-agent-hosts'

const expectedArgs = ['-y', '@agentskit/mcp@0.3.3', '--tools', 'fetch,search']

describe('coding-agent MCP host recipe', () => {
  it('keeps every host on one safe stdio command', () => {
    for (const host of ['claude', 'cursor', 'generic'] as const) {
      const server = codingAgentHostConfigs[host].config.mcpServers.agentskit
      expect(server).toEqual({ type: 'stdio', command: 'npx', args: expectedArgs })
      expect(server.args).not.toContain('--allow-shell')
      expect(server.args).not.toContain('--api-key')
      expect(server.args).not.toContain('--fs-root')
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
    expect(codingAgentHostConfigs.codex.cli).toContain('agentskit -- npx')
    expect(codingAgentHostConfigs.claude.cli).toContain('--scope project --transport stdio agentskit -- npx')
  })

  it('initializes, discovers, and calls an AgentsKit tool without credentials', async () => {
    await expect(verifyCodingAgentMcp()).resolves.toBe(
      'verified hosts: claude, codex, cursor, generic; tool: agentskit_echo',
    )
  })
})
