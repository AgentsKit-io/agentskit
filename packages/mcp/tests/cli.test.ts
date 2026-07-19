import { describe, expect, it, vi } from 'vitest'
import type { McpServer } from '@agentskit/tools/mcp'
import { MCP_CLI_HELP, parseMcpCliArgs, runMcpCli } from '../src/cli'

const server = (): McpServer => ({ close: async () => undefined })

describe('parseMcpCliArgs', () => {
  it('provides safe defaults and parses all supported values', () => {
    expect(parseMcpCliArgs([])).toMatchObject({
      options: { agents: [], allowShell: false, maxSteps: 8, provider: 'openai', tools: ['fetch', 'search'] },
      status: 'parsed',
    })
    expect(parseMcpCliArgs([
      '--tools', 'filesystem,shell,filesystem', '--fs-root', '/tmp/safe', '--allow-shell',
      '--agents', 'one,two', '--provider', 'OLLAMA', '--model', 'local', '--max-steps', '4',
    ])).toMatchObject({
      options: {
        agents: ['one', 'two'], allowShell: true, fsRoot: '/tmp/safe', maxSteps: 4,
        model: 'local', provider: 'ollama', tools: ['filesystem', 'shell'],
      },
      status: 'parsed',
    })
  })

  it.each([
    [['--unknown'], 'unknown argument'],
    [['--tools'], 'missing value'],
    [['--tools', '--help'], 'missing value'],
    [['--tools', 'fetch', '--tools', 'search'], 'duplicate flag'],
    [['--allow-shell', '--allow-shell'], 'duplicate flag'],
    [['--tools', 'unknown'], 'unknown tool'],
    [['--max-steps', '0'], 'safe integer'],
    [['--max-steps', '1.5'], 'safe integer'],
  ])('rejects malformed argv %#', (argv, message) => {
    expect(parseMcpCliArgs(argv)).toMatchObject({ message: expect.stringContaining(message), status: 'rejected' })
  })
})

describe('runMcpCli', () => {
  it('prints help to the injected diagnostic channel', async () => {
    const warn = vi.fn()
    await expect(runMcpCli(['--help'], { warn })).resolves.toEqual({ exitCode: 0, status: 'help' })
    expect(warn).toHaveBeenCalledWith(MCP_CLI_HELP)
  })

  it('starts defaults and never writes through a global logger', async () => {
    const createServer = vi.fn(() => server())
    const warn = vi.fn()
    const result = await runMcpCli([], { createServer, warn })
    expect(result).toMatchObject({ exitCode: 0, status: 'started', toolNames: ['fetch_url', 'web_search'] })
    expect(createServer).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('serving 2 item(s)'))
  })

  it('fails closed for missing privileged-tool configuration', async () => {
    const warn = vi.fn()
    await expect(runMcpCli(['--tools', 'filesystem,sqlite,shell'], {
      createServer: vi.fn(() => server()), warn,
    })).resolves.toEqual({ exitCode: 1, status: 'rejected' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('--fs-root'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('--sqlite'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('--allow-shell'))
  })

  it('builds a registry agent with a local adapter and bounded steps', async () => {
    const createServer = vi.fn(() => server())
    const fetchSkill = vi.fn(async () => ({
      description: 'Agent', id: 'agent-one', systemPrompt: 'Work safely.',
    }))
    const result = await runMcpCli([
      '--tools', '', '--agents', 'agent-one', '--provider', 'ollama', '--model', 'local', '--max-steps', '3',
    ], { createServer, fetchSkill, warn: vi.fn() })
    expect(result).toMatchObject({ exitCode: 0, status: 'started', toolNames: ['agent-one'] })
    expect(fetchSkill).toHaveBeenCalledWith('agent-one')
  })

  it('rejects when agents cannot resolve and no primitive remains', async () => {
    const warn = vi.fn()
    await expect(runMcpCli([
      '--tools', '', '--agents', 'agent-one', '--provider', 'openai',
    ], { env: {}, warn })).resolves.toEqual({ exitCode: 1, status: 'rejected' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('OPENAI_API_KEY'))
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('secret'))
  })

  it('reports parser errors and skips missing registry agents', async () => {
    const warn = vi.fn()
    await expect(runMcpCli(['--bad'], { warn })).resolves.toEqual({ exitCode: 1, status: 'rejected' })

    const createServer = vi.fn(() => server())
    const result = await runMcpCli([
      '--agents', 'missing', '--provider', 'ollama', '--model', 'local',
    ], { createServer, fetchSkill: async () => null, warn })
    expect(result).toMatchObject({ status: 'started', toolNames: ['fetch_url', 'web_search'] })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skipping agent "missing"'))
  })

  it('covers keyed and unknown-provider resolution without exposing credentials', async () => {
    const createServer = vi.fn(() => server())
    const skill = async () => ({ description: 'Agent', id: 'agent', systemPrompt: 'Prompt' })
    await expect(runMcpCli([
      '--tools', '', '--agents', 'agent', '--provider', 'openai', '--api-key', 'private-key',
    ], { createServer, fetchSkill: skill, warn: vi.fn() })).resolves.toMatchObject({ status: 'started' })

    const missingModelWarn = vi.fn()
    await expect(runMcpCli([
      '--tools', '', '--agents', 'agent', '--provider', 'future-provider', '--api-key', 'private-key',
    ], { env: {}, warn: missingModelWarn })).resolves.toEqual({ exitCode: 1, status: 'rejected' })
    expect(missingModelWarn).toHaveBeenCalledWith(expect.stringContaining('pass --model'))

    const unknownWarn = vi.fn()
    await expect(runMcpCli([
      '--tools', '', '--agents', 'agent', '--provider', 'definitely-unknown', '--model', 'model',
      '--api-key', 'private-key',
    ], { env: {}, warn: unknownWarn })).resolves.toEqual({ exitCode: 1, status: 'rejected' })
    expect(JSON.stringify(unknownWarn.mock.calls)).not.toContain('private-key')
  })

  it('routes server errors only through the injected diagnostic channel', async () => {
    const warn = vi.fn()
    const createServer = vi.fn((options: Parameters<NonNullable<Parameters<typeof runMcpCli>[1]['createServer']>>[0]) => {
      options.onEvent?.({ type: 'error' })
      return server()
    })
    await runMcpCli([], { createServer, warn })
    expect(warn).toHaveBeenCalledWith('tool error (unknown): unknown')
  })

  it('contains registry, collision, and startup failures', async () => {
    const warn = vi.fn()
    await expect(runMcpCli([
      '--tools', '', '--agents', 'agent', '--provider', 'ollama', '--model', 'local',
    ], { fetchSkill: async () => { throw new Error('registry secret') }, warn })).resolves.toEqual({
      exitCode: 1,
      status: 'rejected',
    })

    await expect(runMcpCli([
      '--agents', 'agent', '--provider', 'ollama', '--model', 'local',
    ], {
      fetchSkill: async () => ({ description: 'collision', id: 'fetch_url', systemPrompt: 'Prompt' }),
      warn,
    })).resolves.toEqual({ exitCode: 1, status: 'rejected' })
    expect(warn).toHaveBeenCalledWith('duplicate tool name: fetch_url')

    await expect(runMcpCli([], {
      createServer: () => { throw new Error('startup secret') },
      warn,
    })).resolves.toEqual({ exitCode: 1, status: 'rejected' })
    expect(warn).toHaveBeenCalledWith('failed to start MCP server')
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret')
  })
})
