/**
 * Miscellaneous command action tests to cover remaining uncovered lines.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { Command } from 'commander'
import path from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

afterEach(() => {
  vi.restoreAllMocks()
})

function makeProgram(): Command {
  const p = new Command()
  p.exitOverride()
  return p
}

// ---------------------------------------------------------------------------
// registerDoctorCommand — with --providers flag (covers line 16)
// ---------------------------------------------------------------------------

describe('registerDoctorCommand — --providers flag', () => {
  it('runs doctor with explicit provider list and --json', async () => {
    const { registerDoctorCommand } = await import('../src/commands/doctor')
    const program = makeProgram()
    registerDoctorCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'doctor',
      '--no-network',
      '--providers', 'openai,anthropic',
      '--json',
    ])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    const parsed = JSON.parse(output) as Record<string, unknown>
    expect(parsed).toBeTypeOf('object')
  })
})

// ---------------------------------------------------------------------------
// registerInitCommand — interactive not cancelled (covers lines 42, 52)
// ---------------------------------------------------------------------------

describe('registerInitCommand — interactive not cancelled', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'agentskit-init-misc-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('runs writeStarterProject and printNextSteps when interactive completes', async () => {
    vi.resetModules()

    const targetDir = path.join(root, 'my-agent')
    const mockOptions = {
      targetDir,
      template: 'react' as const,
      provider: 'demo' as const,
      tools: [] as never[],
      memory: 'none' as const,
      packageManager: 'pnpm' as const,
    }

    const printNextStepsMock = vi.fn()
    const writeStarterProjectMock = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../src/init-interactive', () => ({
      runInteractiveInit: vi.fn().mockResolvedValue({ cancelled: false, options: mockOptions }),
      printNextSteps: printNextStepsMock,
    }))
    vi.doMock('../src/init', () => ({
      writeStarterProject: writeStarterProjectMock,
    }))

    const { registerInitCommand } = await import('../src/commands/init')
    const program = makeProgram()
    registerInitCommand(program)

    // Force non-TTY=true so interactive path runs
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })

    await program.parseAsync(['node', 'cli', 'init'])

    expect(writeStarterProjectMock).toHaveBeenCalledWith(mockOptions)
    expect(printNextStepsMock).toHaveBeenCalledWith(mockOptions)

    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
  })
})

// ---------------------------------------------------------------------------
// registerRunCommand — --pretty flag (covers line 39)
// ---------------------------------------------------------------------------

describe('registerRunCommand — --pretty flag', () => {
  it('calls ink render when --pretty is used', async () => {
    vi.resetModules()

    vi.doMock('../src/config', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }))
    // Mock ink/render so we don't actually spawn Ink
    const renderMock = vi.fn().mockReturnValue({ waitUntilExit: vi.fn().mockResolvedValue(undefined) })
    vi.doMock('ink', () => ({ render: renderMock }))
    // Mock the run agent to not actually run
    vi.doMock('../src/run', () => ({ runAgent: vi.fn().mockResolvedValue(undefined) }))

    const { registerRunCommand } = await import('../src/commands/run')
    const program = makeProgram()
    registerRunCommand(program)

    await program.parseAsync([
      'node', 'cli', 'run', 'a pretty task',
      '--pretty',
      '--no-config',
    ])

    expect(renderMock).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// registerChatCommand — --no-config path
// (We stop before Ink render by mocking render)
// ---------------------------------------------------------------------------

describe('registerChatCommand — --no-config with mocked render', () => {
  it('sets up session and renders ChatApp when no sessions exist', async () => {
    vi.resetModules()

    const renderMock = vi.fn().mockReturnValue({
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    })
    vi.doMock('ink', () => ({ render: renderMock }))
    vi.doMock('../src/extensibility/plugins', () => ({
      loadPlugins: vi.fn().mockResolvedValue({
        hooks: [],
        mcpServers: [],
        tools: [],
        skills: [],
        slashCommands: [],
        plugins: [],
        providers: {},
      }),
    }))
    vi.doMock('../src/extensibility/hooks', () => ({
      configHooksToHandlers: vi.fn().mockReturnValue([]),
    }))
    vi.doMock('../src/extensibility/mcp', () => ({
      bridgeMcpServers: vi.fn().mockResolvedValue({ clients: [], tools: [] }),
      disposeMcpClients: vi.fn(),
    }))

    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'chat',
      '--no-config',
      '--provider', 'demo',
      '--new',
    ])

    expect(renderMock).toHaveBeenCalledOnce()
  })

  it('writes session save message after chat exits', async () => {
    vi.resetModules()

    const renderMock = vi.fn().mockReturnValue({
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    })
    vi.doMock('ink', () => ({ render: renderMock }))
    vi.doMock('../src/extensibility/plugins', () => ({
      loadPlugins: vi.fn().mockResolvedValue({
        hooks: [],
        mcpServers: [],
        tools: [],
        skills: [],
        slashCommands: [],
        plugins: [],
        providers: {},
      }),
    }))
    vi.doMock('../src/extensibility/hooks', () => ({
      configHooksToHandlers: vi.fn().mockReturnValue([]),
    }))
    vi.doMock('../src/extensibility/mcp', () => ({
      bridgeMcpServers: vi.fn().mockResolvedValue({ clients: [], tools: [] }),
      disposeMcpClients: vi.fn(),
    }))

    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'chat',
      '--no-config',
      '--provider', 'demo',
      '--new',
    ])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    // After rendering completes, should write session resume hint
    expect(output).toContain('agentskit chat --resume')
  })

  it('writes explicit memory path message when --memory is provided', async () => {
    vi.resetModules()

    const renderMock = vi.fn().mockReturnValue({
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    })
    vi.doMock('ink', () => ({ render: renderMock }))
    vi.doMock('../src/extensibility/plugins', () => ({
      loadPlugins: vi.fn().mockResolvedValue({
        hooks: [], mcpServers: [], tools: [], skills: [], slashCommands: [], plugins: [], providers: {},
      }),
    }))
    vi.doMock('../src/extensibility/hooks', () => ({
      configHooksToHandlers: vi.fn().mockReturnValue([]),
    }))
    vi.doMock('../src/extensibility/mcp', () => ({
      bridgeMcpServers: vi.fn().mockResolvedValue({ clients: [], tools: [] }),
      disposeMcpClients: vi.fn(),
    }))

    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'chat',
      '--no-config',
      '--provider', 'demo',
      '--memory', '/tmp/test-memory.json',
    ])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    expect(output).toContain('Resume with --memory')
  })

  it('accepts --plugin-dir flag (covers accumulator on line 34)', async () => {
    vi.resetModules()

    const loadPluginsMock = vi.fn().mockResolvedValue({
      hooks: [], mcpServers: [], tools: [], skills: [], slashCommands: [], plugins: [], providers: {},
    })
    const renderMock = vi.fn().mockReturnValue({
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    })
    vi.doMock('ink', () => ({ render: renderMock }))
    vi.doMock('../src/extensibility/plugins', () => ({ loadPlugins: loadPluginsMock }))
    vi.doMock('../src/extensibility/hooks', () => ({
      configHooksToHandlers: vi.fn().mockReturnValue([]),
    }))
    vi.doMock('../src/extensibility/mcp', () => ({
      bridgeMcpServers: vi.fn().mockResolvedValue({ clients: [], tools: [] }),
      disposeMcpClients: vi.fn(),
    }))

    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'chat',
      '--no-config',
      '--provider', 'demo',
      '--new',
      '--plugin-dir', '/tmp/plugins-a',
      '--plugin-dir', '/tmp/plugins-b',
    ])

    expect(renderMock).toHaveBeenCalledOnce()
    // loadPlugins should have received both plugin dirs
    expect(loadPluginsMock).toHaveBeenCalledWith(
      expect.objectContaining({ pluginDirs: ['/tmp/plugins-a', '/tmp/plugins-b'] }),
    )
  })
})
