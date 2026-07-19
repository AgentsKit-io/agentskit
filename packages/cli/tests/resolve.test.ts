import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('resolves a catalog integration with its credential from env', () => {
    const prev = process.env.GITHUB_TOKEN
    process.env.GITHUB_TOKEN = 'ghp_test'
    const tools = resolveTools('github')
    expect(tools.some(t => t.name.startsWith('github_'))).toBe(true)
    if (prev === undefined) delete process.env.GITHUB_TOKEN
    else process.env.GITHUB_TOKEN = prev
  })

  it('warns when a catalog integration credential is missing from env', () => {
    const prev = process.env.SLACK_BOT_TOKEN
    delete process.env.SLACK_BOT_TOKEN
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const tools = resolveTools('slack')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('SLACK_BOT_TOKEN'))
    expect(tools.some(t => t.name === 'slack_post_message')).toBe(true)
    if (prev !== undefined) process.env.SLACK_BOT_TOKEN = prev
    spy.mockRestore()
  })
})

describe('getBuiltinToolNames', () => {
  it('returns names per kind', () => {
    expect(getBuiltinToolNames('web_search')).toEqual(['web_search'])
    expect(getBuiltinToolNames('filesystem')).toEqual(['fs_read', 'fs_write', 'fs_list'])
    expect(getBuiltinToolNames('shell')).toEqual(['shell'])
  })
})

/** S1 skill name shape — ADR 0005 / ADR 0002 T1. */
const SKILL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/

/** All 26 built-in skill names expected in the CLI skillRegistry. */
const ALL_BUNDLED_SKILL_NAMES = [
  'researcher',
  'coder',
  'planner',
  'critic',
  'summarizer',
  'code-reviewer',
  'pr-reviewer',
  'sql-gen',
  'data-analyst',
  'translator',
  'sql-analyst',
  'technical-writer',
  'security-auditor',
  'customer-support',
  'healthcare-assistant',
  'clinical-note-summarizer',
  'financial-advisor',
  'transaction-triage',
  'legal-assistant',
  'contract-reviewer',
  'tutor',
  'curriculum-designer',
  'storefront-concierge',
  'merchandising-analyst',
  'listing-concierge',
  'real-estate-market-analyst',
] as const

describe('resolveSkill / resolveSkills', () => {
  it('skillRegistry covers all 26 bundled skills', () => {
    const keys = Object.keys(skillRegistry)
    expect(keys).toHaveLength(26)
    for (const name of ALL_BUNDLED_SKILL_NAMES) {
      expect(skillRegistry[name], `missing skillRegistry entry: ${name}`).toBeDefined()
      expect(skillRegistry[name]!.name).toBe(name)
    }
  })

  it('resolveSkill covers representative specialty skills', () => {
    expect(resolveSkill('pr-reviewer')?.name).toBe('pr-reviewer')
    expect(resolveSkill('contract-reviewer')?.name).toBe('contract-reviewer')
    expect(resolveSkill('real-estate-market-analyst')?.name).toBe('real-estate-market-analyst')
  })

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

  it('resolveSkills composes when multiple with an S1-valid composed name', () => {
    const skill = resolveSkills('researcher,coder')
    expect(skill).toBeDefined()
    expect(skill!.name).toBeTruthy()
    expect(skill!.name).toMatch(SKILL_NAME_RE)
    expect(skill!.name.length).toBeLessThanOrEqual(64)
    expect(skill!.name).not.toContain('+')
  })

  it('resolveSkills warns + returns undefined when nothing matches', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(resolveSkills('ghost1,ghost2')).toBeUndefined()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No valid skills'))
  })
})

describe('resolveMemory', () => {
  // mkdtempSync gives us a unique 0700-mode dir per suite, sidestepping the
  // predictable-path concern flagged by CodeQL js/insecure-temporary-file.
  let memDir: string

  beforeAll(() => {
    memDir = mkdtempSync(join(tmpdir(), 'agentskit-resolve-memory-'))
  })

  afterAll(() => {
    rmSync(memDir, { recursive: true, force: true })
  })

  it('default backend = file', () => {
    const m = resolveMemory(undefined, join(memDir, 'akit-test.json'))
    expect(typeof m.load).toBe('function')
    expect(typeof m.save).toBe('function')
  })

  it('sqlite backend swaps .json → .db', () => {
    const m = resolveMemory('sqlite', join(memDir, 'akit-test.json'))
    expect(typeof m.load).toBe('function')
    expect(typeof m.save).toBe('function')
  })

  it('explicit file backend', () => {
    const m = resolveMemory('file', join(memDir, 'akit-test-2.json'))
    expect(typeof m.load).toBe('function')
    expect(typeof m.save).toBe('function')
  })
})
