/**
 * Tests for command action handlers that don't require Ink rendering.
 * We focus on the CLI parsing paths for commands that were still at low %.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { Command } from 'commander'
import path from 'node:path'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
// registerDevCommand — startDev is mocked so done never resolves
// ---------------------------------------------------------------------------

describe('registerDevCommand — action handler', () => {
  it('passes correct options to startDev (default entry)', async () => {
    vi.resetModules()

    const mockController = { done: new Promise(() => {}), stop: vi.fn(), restarts: () => 0 }
    const startDevMock = vi.fn().mockReturnValue(mockController)

    vi.doMock('../src/dev', () => ({ startDev: startDevMock }))

    const { registerDevCommand } = await import('../src/commands/dev')
    const program = makeProgram()
    registerDevCommand(program)

    // Don't await — done is a hanging promise; just fire and check
    const promise = program.parseAsync(['node', 'cli', 'dev', 'src/index.ts'])
    // Give a tick for the async action to call startDev
    await new Promise(r => setTimeout(r, 50))

    expect(startDevMock).toHaveBeenCalledWith(
      expect.objectContaining({ entry: 'src/index.ts' }),
    )
    // Resolve by stopping the hang
    promise.catch(() => {})
  })

  it('passes watch/ignore/debounce options', async () => {
    vi.resetModules()

    const mockController = { done: new Promise(() => {}), stop: vi.fn(), restarts: () => 0 }
    const startDevMock = vi.fn().mockReturnValue(mockController)

    vi.doMock('../src/dev', () => ({ startDev: startDevMock }))

    const { registerDevCommand } = await import('../src/commands/dev')
    const program = makeProgram()
    registerDevCommand(program)

    const promise = program.parseAsync([
      'node', 'cli', 'dev', 'src/app.ts',
      '--watch', 'src/**,lib/**',
      '--ignore', 'dist/**',
      '--debounce', '500',
    ])
    await new Promise(r => setTimeout(r, 50))

    expect(startDevMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: 'src/app.ts',
        watch: ['src/**', 'lib/**'],
        ignore: ['dist/**'],
        debounceMs: 500,
      }),
    )
    promise.catch(() => {})
  })

  it('writes error to stderr and exits 1 when startDev throws', async () => {
    vi.resetModules()
    vi.doMock('../src/dev', () => ({
      startDev: vi.fn().mockImplementation(() => {
        throw new Error('dev failed hard')
      }),
    }))

    const { registerDevCommand } = await import('../src/commands/dev')
    const program = makeProgram()
    registerDevCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'dev', 'src/index.ts']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('dev failed hard'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// registerTunnelCommand — action handler full coverage
// ---------------------------------------------------------------------------

describe('registerTunnelCommand — action with mock startTunnel', () => {
  it('calls startTunnel with parsed port, subdomain, host and awaits done', async () => {
    vi.resetModules()

    const mockDone = Promise.resolve()
    const startTunnelMock = vi.fn().mockResolvedValue({
      done: mockDone,
      stop: vi.fn(),
      url: 'http://fake.loca.lt',
      requests: () => 0,
    })

    vi.doMock('../src/tunnel', () => ({ startTunnel: startTunnelMock }))

    const { registerTunnelCommand } = await import('../src/commands/tunnel')
    const program = makeProgram()
    registerTunnelCommand(program)

    await program.parseAsync([
      'node', 'cli', 'tunnel', '4000',
      '--subdomain', 'my-app',
      '--host', '127.0.0.1',
    ])

    expect(startTunnelMock).toHaveBeenCalledWith({
      port: 4000,
      subdomain: 'my-app',
      host: '127.0.0.1',
    })
  })

  it('catches startTunnel rejection and exits 1', async () => {
    vi.resetModules()

    vi.doMock('../src/tunnel', () => ({
      startTunnel: vi.fn().mockRejectedValue(new Error('tunnel down')),
    }))

    const { registerTunnelCommand } = await import('../src/commands/tunnel')
    const program = makeProgram()
    registerTunnelCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'tunnel', '3000']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('tunnel down'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// registerPiiCommand — action handler
// ---------------------------------------------------------------------------

describe('registerPiiCommand — action handler', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'agentskit-pii-cmd-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('runs pii lint on a valid JSON file', async () => {
    const { registerPiiCommand } = await import('../src/commands/pii')
    const program = makeProgram()
    registerPiiCommand(program)

    // Write a minimal valid taxonomy file (version + rules array with valid entries)
    const taxFile = path.join(dir, 'tax.json')
    writeFileSync(taxFile, JSON.stringify({
      version: '1',
      rules: [{ name: 'email', pattern: '[a-z]+@[a-z]+' }],
    }))

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    await program.parseAsync(['node', 'cli', 'pii', 'lint', taxFile])
    // Just ensure it ran without throwing
    expect(stdoutSpy).toHaveBeenCalled()
  })

  it('runs pii lint --json on a valid file', async () => {
    const { registerPiiCommand } = await import('../src/commands/pii')
    const program = makeProgram()
    registerPiiCommand(program)

    const taxFile = path.join(dir, 'tax.json')
    writeFileSync(taxFile, JSON.stringify({
      version: '1',
      rules: [{ name: 'email', pattern: '[a-z]+@[a-z]+' }],
    }))

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    await program.parseAsync(['node', 'cli', 'pii', 'lint', '--json', taxFile])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    const parsed = JSON.parse(output) as unknown[]
    expect(Array.isArray(parsed)).toBe(true)
  })

  it('exits 1 when lint fails and outputs error count', async () => {
    const { registerPiiCommand } = await import('../src/commands/pii')
    const program = makeProgram()
    registerPiiCommand(program)

    // bad.json has invalid taxonomy (missing required fields)
    const badFile = path.join(dir, 'bad.json')
    writeFileSync(badFile, JSON.stringify({ version: '2', rules: 'oops' }))

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'pii', 'lint', badFile]),
    ).rejects.toThrow('exit')
    expect(exitSpy).toHaveBeenCalledWith(1)
    // stderr should mention failure count
    expect(stderrSpy).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// registerRunCommand — action handler with mock runAgent
// ---------------------------------------------------------------------------

describe('registerRunCommand — action handler', () => {
  it('calls runAgent with task from positional arg', async () => {
    vi.resetModules()

    const runAgentMock = vi.fn().mockResolvedValue(undefined)
    vi.doMock('../src/run', () => ({ runAgent: runAgentMock }))
    // Mock loadConfig too
    vi.doMock('../src/config', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }))

    const { registerRunCommand } = await import('../src/commands/run')
    const program = makeProgram()
    registerRunCommand(program)

    await program.parseAsync([
      'node', 'cli', 'run', 'do my task',
      '--provider', 'demo',
      '--no-config',
    ])

    expect(runAgentMock).toHaveBeenCalledWith(
      'do my task',
      expect.objectContaining({ provider: 'demo' }),
    )
  })

  it('calls runAgent with task from --task flag', async () => {
    vi.resetModules()

    const runAgentMock = vi.fn().mockResolvedValue(undefined)
    vi.doMock('../src/run', () => ({ runAgent: runAgentMock }))
    vi.doMock('../src/config', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }))

    const { registerRunCommand } = await import('../src/commands/run')
    const program = makeProgram()
    registerRunCommand(program)

    await program.parseAsync([
      'node', 'cli', 'run',
      '--task', 'flagged task',
      '--no-config',
    ])

    expect(runAgentMock).toHaveBeenCalledWith('flagged task', expect.any(Object))
  })

  it('catches runAgent error and exits 1', async () => {
    vi.resetModules()

    vi.doMock('../src/run', () => ({
      runAgent: vi.fn().mockRejectedValue(new Error('agent failed')),
    }))
    vi.doMock('../src/config', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }))

    const { registerRunCommand } = await import('../src/commands/run')
    const program = makeProgram()
    registerRunCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'run', 'a task', '--no-config']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('agent failed'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// registerDoctorCommand — action handler
// ---------------------------------------------------------------------------

describe('registerDoctorCommand — formatted output (no --json)', () => {
  it('runs doctor and writes formatted output to stdout', async () => {
    const { registerDoctorCommand } = await import('../src/commands/doctor')
    const program = makeProgram()
    registerDoctorCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync(['node', 'cli', 'doctor', '--no-network'])

    expect(stdoutSpy).toHaveBeenCalled()
    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    expect(output.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// registerAiCommand — dry-run mode
// ---------------------------------------------------------------------------

describe('registerAiCommand — dry-run', () => {
  it('prints JSON plan to stdout with --dry-run', async () => {
    vi.resetModules()

    const mockSchema = { name: 'test-agent', tools: [], skills: [] }
    const mockFiles = [{ path: 'src/index.ts', content: '' }]

    vi.doMock('../src/ai', () => ({
      writeScaffold: vi.fn().mockResolvedValue([]),
      scaffoldAgent: vi.fn().mockReturnValue(mockFiles),
      createAdapterPlanner: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(mockSchema)),
    }))

    const { registerAiCommand } = await import('../src/commands/ai')
    const program = makeProgram()
    registerAiCommand(program)

    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'ai', 'build a weather agent',
      '--provider', 'demo',
      '--dry-run',
    ])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    const parsed = JSON.parse(output) as Record<string, unknown>
    expect(parsed).toHaveProperty('schema')
    expect(parsed).toHaveProperty('files')
  })

  it('writes scaffold files without --dry-run', async () => {
    vi.resetModules()

    const mockSchema = { name: 'test-agent', tools: [], skills: [] }
    const mockFiles = [{ path: 'src/index.ts', content: '' }]
    const writeScaffoldMock = vi.fn().mockResolvedValue(['src/index.ts'])

    vi.doMock('../src/ai', () => ({
      writeScaffold: writeScaffoldMock,
      scaffoldAgent: vi.fn().mockReturnValue(mockFiles),
      createAdapterPlanner: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(mockSchema)),
    }))

    const { registerAiCommand } = await import('../src/commands/ai')
    const program = makeProgram()
    registerAiCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await program.parseAsync([
      'node', 'cli', 'ai', 'build a weather agent',
      '--provider', 'demo',
    ])

    expect(writeScaffoldMock).toHaveBeenCalledOnce()
    const output = stderrSpy.mock.calls.map(c => c[0] as string).join('')
    expect(output).toContain('Wrote')
  })
})

// ---------------------------------------------------------------------------
// registerRagCommand — action with sources
// ---------------------------------------------------------------------------

describe('registerRagCommand — action with sources', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'agentskit-rag-sources-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('indexes files passed via --source', async () => {
    vi.resetModules()

    const mdFile = path.join(dir, 'doc.md')
    writeFileSync(mdFile, 'hello world')

    vi.doMock('../src/config', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }))
    vi.doMock('../src/extensibility/rag', () => ({
      buildRagFromConfig: vi.fn().mockReturnValue({
        ingest: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([]),
      }),
      indexSources: vi.fn().mockResolvedValue({ documentCount: 1, sources: [mdFile] }),
    }))

    const { registerRagCommand } = await import('../src/commands/rag')
    const program = makeProgram()
    registerRagCommand(program)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync(['node', 'cli', 'rag', 'index', '--source', '*.md'])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    expect(output).toContain('Indexed')
  })

  it('catches indexing error and exits 1', async () => {
    vi.resetModules()

    vi.doMock('../src/config', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }))
    vi.doMock('../src/extensibility/rag', () => ({
      buildRagFromConfig: vi.fn().mockReturnValue({}),
      indexSources: vi.fn().mockRejectedValue(new Error('index failed')),
    }))

    const { registerRagCommand } = await import('../src/commands/rag')
    const program = makeProgram()
    registerRagCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'rag', 'index', '--source', '*.md']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('index failed'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// registerInitCommand — non-CI (interactive cancel)
// ---------------------------------------------------------------------------

describe('registerInitCommand — interactive cancelled', () => {
  it('exits 0 when interactive init is cancelled', async () => {
    vi.resetModules()

    vi.doMock('../src/init-interactive', () => ({
      runInteractiveInit: vi.fn().mockResolvedValue({ cancelled: true }),
      printNextSteps: vi.fn(),
    }))
    vi.doMock('../src/init', () => ({
      writeStarterProject: vi.fn().mockResolvedValue(undefined),
    }))

    const { registerInitCommand } = await import('../src/commands/init')
    const program = makeProgram()
    registerInitCommand(program)

    // Force non-TTY so interactive path runs: stub isTTY = true but no template
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'init']),
    ).rejects.toThrow('exit')
    expect(exitSpy).toHaveBeenCalledWith(0)

    // restore
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
  })
})

// ---------------------------------------------------------------------------
// registerRulesCommand — error path
// ---------------------------------------------------------------------------

describe('registerRulesCommand — error from writeRules', () => {
  it('catches writeRules error and exits 1', async () => {
    vi.resetModules()

    vi.doMock('../src/rules', () => ({
      writeRules: vi.fn().mockRejectedValue(new Error('write failed')),
    }))

    const { registerRulesCommand } = await import('../src/commands/rules')
    const program = makeProgram()
    registerRulesCommand(program)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      program.parseAsync(['node', 'cli', 'rules', 'cursor']),
    ).rejects.toThrow('exit')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('write failed'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
