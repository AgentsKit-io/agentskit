import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getBuiltinToolNames,
  resolveMemory,
  resolveSkill,
  resolveSkills,
  resolveTools,
  skillRegistry,
} from '../src/resolve'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveTools', () => {
  it('default registers web_search + fetch_url with confirmation', () => {
    const tools = resolveTools(undefined)
    expect(tools.length).toBeGreaterThanOrEqual(2)
    for (const t of tools) expect(t.requiresConfirmation).toBe(true)
  })

  it('explicit list registers without confirmation', () => {
    const tools = resolveTools('web_search,fetch_url')
    expect(tools.length).toBeGreaterThanOrEqual(2)
    expect(tools.every(t => t.requiresConfirmation !== true)).toBe(true)
  })

  it('shell tool has explicit timeout', () => {
    const tools = resolveTools('shell')
    expect(tools.length).toBe(1)
    expect(tools[0]!.name).toMatch(/shell/i)
  })

  it('filesystem returns multiple sub-tools', () => {
    const tools = resolveTools('filesystem')
    expect(tools.length).toBeGreaterThan(1)
  })

  it('warns and skips unknown tool names', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const tools = resolveTools('web_search,bogus')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown tool: bogus'))
    expect(tools.length).toBe(1)
    spy.mockRestore()
  })

  it('trims whitespace', () => {
    const tools = resolveTools(' web_search , fetch_url ')
    expect(tools.length).toBe(2)
  })
})

describe('getBuiltinToolNames', () => {
  it('returns names per kind', () => {
    expect(getBuiltinToolNames('web_search')).toEqual(['web_search'])
    expect(getBuiltinToolNames('filesystem')).toEqual(['fs_read', 'fs_write', 'fs_list'])
    expect(getBuiltinToolNames('shell')).toEqual(['shell'])
  })
})

describe('resolveSkill / resolveSkills', () => {
  it('resolveSkill returns undefined for missing input', () => {
    expect(resolveSkill(undefined)).toBeUndefined()
  })

  it('resolveSkill returns registered skill', () => {
    expect(resolveSkill('researcher')).toBe(skillRegistry.researcher)
  })

  it('resolveSkill warns on unknown name', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(resolveSkill('ghost')).toBeUndefined()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown skill'))
  })

  it('resolveSkills undefined for missing input', () => {
    expect(resolveSkills(undefined)).toBeUndefined()
  })

  it('resolveSkills returns single skill when only one matches', () => {
    expect(resolveSkills('researcher')).toBe(skillRegistry.researcher)
  })

  it('resolveSkills composes when multiple', () => {
    const skill = resolveSkills('researcher,coder')
    expect(skill).toBeDefined()
    expect(skill!.name).toBeTruthy()
  })

  it('resolveSkills warns + returns undefined when nothing matches', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(resolveSkills('ghost1,ghost2')).toBeUndefined()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No valid skills'))
  })
})

describe('resolveMemory', () => {
  it('default backend = file', () => {
    const m = resolveMemory(undefined, '/tmp/akit-test.json')
    expect(typeof m.load).toBe('function')
    expect(typeof m.save).toBe('function')
  })

  it('sqlite backend swaps .json → .db', () => {
    const m = resolveMemory('sqlite', '/tmp/akit-test.json')
    expect(typeof m.load).toBe('function')
    expect(typeof m.save).toBe('function')
  })

  it('explicit file backend', () => {
    const m = resolveMemory('file', '/tmp/akit-test-2.json')
    expect(typeof m.load).toBe('function')
    expect(typeof m.save).toBe('function')
  })
})
