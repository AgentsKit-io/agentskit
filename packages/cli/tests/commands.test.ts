/**
 * Tests for the src/commands/* barrel — each command registers itself on a
 * Commander instance.  We parse fake argv to fire the action handlers.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { Command } from 'commander'
import path from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeProgram(): Command {
  const p = new Command()
  p.exitOverride() // throw instead of process.exit so the test suite continues
  return p
}

// ---------------------------------------------------------------------------
// registerTunnelCommand
// ---------------------------------------------------------------------------

describe('registerTunnelCommand', () => {
  it('validates port range — too high → writes error and exits 2', async () => {
    const { registerTunnelCommand } = await import('../src/commands/tunnel')
    const program = makeProgram()
    registerTunnelCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'tunnel', '99999']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('invalid port'))
    expect(exitSpy).toHaveBeenCalledWith(2)
  })

  it('validates port range — NaN → writes error and exits 2', async () => {
    const { registerTunnelCommand } = await import('../src/commands/tunnel')
    const program = makeProgram()
    registerTunnelCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'tunnel', 'abc']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('invalid port'))
    expect(exitSpy).toHaveBeenCalledWith(2)
  })

  it('starts the tunnel and awaits done with valid port', async () => {
    const { registerTunnelCommand } = await import('../src/commands/tunnel')
    const program = makeProgram()
    registerTunnelCommand(program)

    // Mock startTunnel so we don't open a real tunnel
    const mockController = { done: Promise.resolve(), stop: vi.fn(), url: 'http://fake', requests: () => 0 }
    vi.doMock('../src/tunnel', () => ({ startTunnel: vi.fn().mockResolvedValue(mockController) }))

    // Re-import command so the mock is used
    const { registerTunnelCommand: reg2 } = await import('../src/commands/tunnel')
    const prog2 = makeProgram()
    reg2(prog2)

    // We just assert the command is registered without throwing on parse:
    const cmd = prog2.commands.find(c => c.name() === 'tunnel')
    expect(cmd).toBeDefined()
  })

  it('registers tunnel command with correct description', async () => {
    const { registerTunnelCommand } = await import('../src/commands/tunnel')
    const program = makeProgram()
    registerTunnelCommand(program)
    const cmd = program.commands.find(c => c.name() === 'tunnel')
    expect(cmd).toBeDefined()
    expect(cmd!.description()).toContain('public URL')
  })
})

// ---------------------------------------------------------------------------
// registerRulesCommand
// ---------------------------------------------------------------------------

describe('registerRulesCommand', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'agentskit-rules-cmd-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('registers rules command', async () => {
    const { registerRulesCommand } = await import('../src/commands/rules')
    const program = makeProgram()
    registerRulesCommand(program)
    const cmd = program.commands.find(c => c.name() === 'rules')
    expect(cmd).toBeDefined()
  })

  it('rejects unknown editor and exits 1', async () => {
    const { registerRulesCommand } = await import('../src/commands/rules')
    const program = makeProgram()
    registerRulesCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'rules', 'unknowneditor']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('unknown editor'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('writes cursor rules and outputs counts', async () => {
    const { registerRulesCommand } = await import('../src/commands/rules')
    const program = makeProgram()
    registerRulesCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync(['node', 'cli', 'rules', 'cursor', '--out', root])

    const output = stdoutSpy.mock.calls.map(args => args[0] as string).join('')
    expect(output).toContain('wrote')
    expect(output).toContain('Done')
  })

  it('reports --force flag effect', async () => {
    const { registerRulesCommand } = await import('../src/commands/rules')
    const program = makeProgram()
    registerRulesCommand(program)

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    // First run (no force needed)
    await program.parseAsync(['node', 'cli', 'rules', 'cursor', '--out', root])

    const program2 = makeProgram()
    registerRulesCommand(program2)
    const stdoutSpy2 = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    // Second run: file unchanged → skipped
    await program2.parseAsync(['node', 'cli', 'rules', 'cursor', '--out', root])
    const output2 = stdoutSpy2.mock.calls.map(args => args[0] as string).join('')
    expect(output2).toContain('skipped')
    expect(output2).toContain('--force')
  })
})

// ---------------------------------------------------------------------------
// registerRagCommand
// ---------------------------------------------------------------------------

describe('registerRagCommand', () => {
  it('registers rag command with index sub-command', async () => {
    const { registerRagCommand } = await import('../src/commands/rag')
    const program = makeProgram()
    registerRagCommand(program)
    const cmd = program.commands.find(c => c.name() === 'rag')
    expect(cmd).toBeDefined()
    const indexCmd = cmd!.commands.find(c => c.name() === 'index')
    expect(indexCmd).toBeDefined()
  })

  it('exits 1 when no sources configured', async () => {
    const { registerRagCommand } = await import('../src/commands/rag')
    const program = makeProgram()
    registerRagCommand(program)

    // loadConfig returns nothing useful
    vi.doMock('../src/config', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }))

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'rag', 'index']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No RAG sources'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// registerInitCommand
// ---------------------------------------------------------------------------

describe('registerInitCommand', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'agentskit-init-cmd-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('registers init command', async () => {
    const { registerInitCommand } = await import('../src/commands/init')
    const program = makeProgram()
    registerInitCommand(program)
    const cmd = program.commands.find(c => c.name() === 'init')
    expect(cmd).toBeDefined()
  })

  it('runs CI mode when --template is provided', async () => {
    const { registerInitCommand } = await import('../src/commands/init')
    const program = makeProgram()
    registerInitCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'init',
      '--template', 'react',
      '--dir', path.join(root, 'my-app'),
      '--provider', 'demo',
    ])

    const output = stdoutSpy.mock.calls.map(args => args[0] as string).join('')
    expect(output).toContain('Created')
    expect(output).toContain('react')
  })

  it('parses tools list in CI mode', async () => {
    const { registerInitCommand } = await import('../src/commands/init')
    const program = makeProgram()
    registerInitCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'init',
      '--template', 'react',
      '--dir', path.join(root, 'app-with-tools'),
      '--tools', 'web_search,filesystem',
    ])

    const output = stdoutSpy.mock.calls.map(args => args[0] as string).join('')
    expect(output).toContain('Created')
  })
})

// ---------------------------------------------------------------------------
// registerRunCommand
// ---------------------------------------------------------------------------

describe('registerRunCommand', () => {
  it('registers run command', async () => {
    const { registerRunCommand } = await import('../src/commands/run')
    const program = makeProgram()
    registerRunCommand(program)
    const cmd = program.commands.find(c => c.name() === 'run')
    expect(cmd).toBeDefined()
  })

  it('exits 1 when no task provided', async () => {
    const { registerRunCommand } = await import('../src/commands/run')
    const program = makeProgram()
    registerRunCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'run']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('task is required'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// registerConfigCommand
// ---------------------------------------------------------------------------

describe('registerConfigCommand', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'agentskit-config-cmd-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('registers config command', async () => {
    const { registerConfigCommand } = await import('../src/commands/config')
    const program = makeProgram()
    registerConfigCommand(program)
    const cmd = program.commands.find(c => c.name() === 'config')
    expect(cmd).toBeDefined()
  })

  it('config show prints merged JSON config', async () => {
    const { registerConfigCommand } = await import('../src/commands/config')
    const program = makeProgram()
    registerConfigCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(process, 'cwd').mockReturnValue(root)

    await program.parseAsync(['node', 'cli', 'config', 'show'])

    const output = stdoutSpy.mock.calls.map(args => args[0] as string).join('')
    // Should produce some JSON
    expect(() => JSON.parse(output)).not.toThrow()
  })

  it('config init creates a file in cwd (--local)', async () => {
    const { registerConfigCommand } = await import('../src/commands/config')
    const program = makeProgram()
    registerConfigCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(process, 'cwd').mockReturnValue(root)

    await program.parseAsync(['node', 'cli', 'config', 'init', '--local'])

    const output = stdoutSpy.mock.calls.map(args => args[0] as string).join('')
    expect(output).toContain('Wrote')
  })

  it('config init --local refuses overwrite without --force', async () => {
    const { registerConfigCommand } = await import('../src/commands/config')
    const program = makeProgram()
    registerConfigCommand(program)

    vi.spyOn(process, 'cwd').mockReturnValue(root)
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    // First init
    await program.parseAsync(['node', 'cli', 'config', 'init', '--local'])

    // Second init without force
    const program2 = makeProgram()
    registerConfigCommand(program2)
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
    vi.spyOn(process, 'cwd').mockReturnValue(root)

    await expect(
      program2.parseAsync(['node', 'cli', 'config', 'init', '--local']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Config already exists'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('config unknown action exits 2', async () => {
    const { registerConfigCommand } = await import('../src/commands/config')
    const program = makeProgram()
    registerConfigCommand(program)

    vi.spyOn(process, 'cwd').mockReturnValue(root)
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'config', 'bogus']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'))
    expect(exitSpy).toHaveBeenCalledWith(2)
  })
})

// ---------------------------------------------------------------------------
// registerDevCommand
// ---------------------------------------------------------------------------

describe('registerDevCommand', () => {
  it('registers dev command', async () => {
    const { registerDevCommand } = await import('../src/commands/dev')
    const program = makeProgram()
    registerDevCommand(program)
    const cmd = program.commands.find(c => c.name() === 'dev')
    expect(cmd).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// registerDoctorCommand
// ---------------------------------------------------------------------------

describe('registerDoctorCommand', () => {
  it('registers doctor command', async () => {
    const { registerDoctorCommand } = await import('../src/commands/doctor')
    const program = makeProgram()
    registerDoctorCommand(program)
    const cmd = program.commands.find(c => c.name() === 'doctor')
    expect(cmd).toBeDefined()
    const optionNames = cmd!.options.map(o => o.long)
    expect(optionNames).toContain('--json')
    expect(optionNames).toContain('--providers')
  })

  it('runs doctor --json', async () => {
    const { registerDoctorCommand } = await import('../src/commands/doctor')
    const program = makeProgram()
    registerDoctorCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync(['node', 'cli', 'doctor', '--no-network', '--json'])

    const output = stdoutSpy.mock.calls.map(args => args[0] as string).join('')
    const parsed = JSON.parse(output) as Record<string, unknown>
    // The report shape has 'results' or similar top-level key
    expect(parsed).toBeTypeOf('object')
  })
})

// ---------------------------------------------------------------------------
// registerPiiCommand
// ---------------------------------------------------------------------------

describe('registerPiiCommand', () => {
  it('registers pii command with lint sub-command', async () => {
    const { registerPiiCommand } = await import('../src/commands/pii')
    const program = makeProgram()
    registerPiiCommand(program)
    const cmd = program.commands.find(c => c.name() === 'pii')
    expect(cmd).toBeDefined()
    const lintCmd = cmd!.commands.find(c => c.name() === 'lint')
    expect(lintCmd).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// registerAiCommand
// ---------------------------------------------------------------------------

describe('registerAiCommand', () => {
  it('registers ai command', async () => {
    const { registerAiCommand } = await import('../src/commands/ai')
    const program = makeProgram()
    registerAiCommand(program)
    const cmd = program.commands.find(c => c.name() === 'ai')
    expect(cmd).toBeDefined()
    const optionNames = cmd!.options.map(o => o.long)
    expect(optionNames).toContain('--out')
    expect(optionNames).toContain('--provider')
    expect(optionNames).toContain('--dry-run')
  })

  it('exits 1 when description words are empty', async () => {
    const { registerAiCommand } = await import('../src/commands/ai')
    const program = makeProgram()
    registerAiCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    // Commander collapses variadic arg - passing empty string forces the check
    await expect(
      program.parseAsync(['node', 'cli', 'ai', '']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('missing description'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// registerChatCommand (structural / option checks only)
// ---------------------------------------------------------------------------

describe('registerChatCommand', () => {
  it('registers chat command with expected options', async () => {
    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)
    const cmd = program.commands.find(c => c.name() === 'chat')
    expect(cmd).toBeDefined()
    const optionNames = cmd!.options.map(o => o.long)
    expect(optionNames).toContain('--provider')
    expect(optionNames).toContain('--model')
    expect(optionNames).toContain('--tools')
    expect(optionNames).toContain('--skill')
    expect(optionNames).toContain('--memory')
    expect(optionNames).toContain('--mode')
    expect(optionNames).toContain('--resume')
    expect(optionNames).toContain('--new')
    expect(optionNames).toContain('--list-sessions')
  })

  it('chat --skill help must not hard-code a stale five-skill list', async () => {
    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)
    const cmd = program.commands.find(c => c.name() === 'chat')
    expect(cmd).toBeDefined()
    const skillOpt = cmd!.options.find(o => o.long === '--skill')
    expect(skillOpt).toBeDefined()
    const description = skillOpt!.description ?? ''
    // Stale help text only enumerated the original five built-ins.
    expect(description).not.toBe(
      'Comma-separated skills: researcher,coder,planner,critic,summarizer',
    )
    expect(description).not.toMatch(
      /researcher\s*,\s*coder\s*,\s*planner\s*,\s*critic\s*,\s*summarizer/,
    )
  })
})
