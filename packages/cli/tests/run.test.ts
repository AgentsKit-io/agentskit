import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveTools, resolveSkill, resolveSkills, resolveMemory } from '../src/resolve'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('resolveTools', () => {
  it('returns empty array for undefined', () => {
    expect(resolveTools(undefined)).toEqual([])
  })

  it('resolves known tools', () => {
    const tools = resolveTools('web_search,shell')
    expect(tools.length).toBe(2)
    expect(tools.map(t => t.name)).toContain('web_search')
  })

  it('writes to stderr for unknown tools', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    resolveTools('nonexistent')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown tool'))
    spy.mockRestore()
  })
})

describe('resolveSkill', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveSkill(undefined)).toBeUndefined()
  })

  it('resolves a known skill', () => {
    const skill = resolveSkill('researcher')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('researcher')
  })

  it('returns undefined for unknown skill', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(resolveSkill('nonexistent')).toBeUndefined()
    spy.mockRestore()
  })
})

describe('resolveSkills', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveSkills(undefined)).toBeUndefined()
  })

  it('resolves a single skill without composing', () => {
    const skill = resolveSkills('researcher')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('researcher')
  })

  it('composes multiple skills', () => {
    const skill = resolveSkills('researcher,coder')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('researcher+coder')
  })

  it('returns undefined for all unknown skills', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(resolveSkills('nonexistent,also_nonexistent')).toBeUndefined()
    spy.mockRestore()
  })
})

describe('resolveMemory', () => {
  it('returns file memory by default', () => {
    const memory = resolveMemory(undefined, './test.json')
    expect(memory).toBeDefined()
    expect(typeof memory.load).toBe('function')
    expect(typeof memory.save).toBe('function')
  })

  it('returns file memory for "file" backend', () => {
    const memory = resolveMemory('file', './test.json')
    expect(memory).toBeDefined()
  })

  it('returns sqlite memory for "sqlite" backend', () => {
    const memory = resolveMemory('sqlite', './test.json')
    expect(memory).toBeDefined()
    expect(typeof memory.load).toBe('function')
  })
})

describe('run command integration', () => {
  it('createCli registers run command', async () => {
    const { createCli } = await import('../src/commands')
    const cli = createCli()
    const runCmd = cli.commands.find(c => c.name() === 'run')
    expect(runCmd).toBeDefined()
  })

  it('run command has required options', async () => {
    const { createCli } = await import('../src/commands')
    const cli = createCli()
    const runCmd = cli.commands.find(c => c.name() === 'run')!
    const optionNames = runCmd.options.map(o => o.long)
    expect(optionNames).toContain('--provider')
    expect(optionNames).toContain('--model')
    expect(optionNames).toContain('--api-key')
    expect(optionNames).toContain('--skill')
    expect(optionNames).toContain('--skills')
    expect(optionNames).toContain('--tools')
    expect(optionNames).toContain('--memory')
    expect(optionNames).toContain('--memory-backend')
    expect(optionNames).toContain('--system-prompt')
    expect(optionNames).toContain('--max-steps')
    expect(optionNames).toContain('--verbose')
    expect(optionNames).toContain('--pretty')
    expect(optionNames).toContain('--task')
  })
})
