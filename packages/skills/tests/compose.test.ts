import { describe, it, expect } from 'vitest'
import type { SkillDefinition } from '@agentskit/core'
import { ConfigError, ErrorCodes, SkillError } from '@agentskit/core'
import { composeSkills } from '../src/compose'
import { researcher, coder, planner, summarizer } from '../src/index'
import { SKILL_NAME_RE } from '../fixtures/all-builtin-skills'
import { makeTool } from '../fixtures/tool-definitions'

function baseSkill(overrides: Partial<SkillDefinition> & Pick<SkillDefinition, 'name'>): SkillDefinition {
  return {
    description: `${overrides.name} description`,
    systemPrompt: `${overrides.name} system prompt with enough substance`,
    tools: [],
    delegates: [],
    ...overrides,
  }
}

function expectConfigOrSkillError(err: unknown): asserts err is ConfigError | SkillError {
  expect(err).toBeInstanceOf(Error)
  const isTyped =
    err instanceof ConfigError ||
    err instanceof SkillError ||
    (err instanceof Error && 'code' in err && typeof (err as { code: unknown }).code === 'string')
  expect(isTyped).toBe(true)
  const code = (err as { code: string }).code
  expect(
    code === ErrorCodes.AK_CONFIG_INVALID ||
      code === ErrorCodes.AK_SKILL_INVALID ||
      code.startsWith('AK_CONFIG') ||
      code.startsWith('AK_SKILL'),
  ).toBe(true)
}

describe('composeSkills', () => {
  it('throws ConfigError on zero skills', () => {
    try {
      composeSkills()
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError)
      expect((err as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      expect((err as Error).message).toMatch(/at least one skill/i)
    }
  })

  it('returns a value-equivalent skill that is not the same object for one input', () => {
    const input = baseSkill({
      name: 'solo',
      tools: ['web_search'],
      delegates: ['critic'],
      examples: [{ input: 'q', output: 'a' }],
      temperature: 0.4,
      metadata: { tag: 'solo', nested: { n: 1 } },
    })
    const result = composeSkills(input)
    expect(result).not.toBe(input)
    expect(result.name).toBe(input.name)
    expect(result.description).toBe(input.description)
    expect(result.systemPrompt).toBe(input.systemPrompt)
    expect(result.tools).toEqual(input.tools)
    expect(result.delegates).toEqual(input.delegates)
    expect(result.examples).toEqual(input.examples)
    expect(result.temperature).toBe(input.temperature)
    expect(result.metadata).toEqual(input.metadata)
  })

  it('defensively copies arrays, examples, and metadata so result mutation cannot mutate input', () => {
    const input = baseSkill({
      name: 'copy_me',
      tools: ['t1'],
      delegates: ['d1'],
      examples: [{ input: 'in', output: 'out' }],
      metadata: { a: 1, nested: { b: 2 } },
    })
    const result = composeSkills(input)

    result.tools!.push('mutated_tool')
    result.delegates!.push('mutated_delegate')
    result.examples!.push({ input: 'x', output: 'y' })
    result.examples![0]!.input = 'MUTATED'
    if (result.metadata) {
      result.metadata.a = 999
      ;(result.metadata.nested as { b: number }).b = 999
    }

    expect(input.tools).toEqual(['t1'])
    expect(input.delegates).toEqual(['d1'])
    expect(input.examples).toEqual([{ input: 'in', output: 'out' }])
    expect(input.metadata).toEqual({ a: 1, nested: { b: 2 } })
  })

  it('2-way composition produces a deterministic S1-valid name ≤64 chars', () => {
    const a = composeSkills(researcher, coder)
    const b = composeSkills(researcher, coder)
    expect(a.name).toBe(b.name)
    expect(a.name).toMatch(SKILL_NAME_RE)
    expect(a.name.length).toBeLessThanOrEqual(64)
    // Must not use the old `+` joiner (S1 forbids `+`).
    expect(a.name).not.toContain('+')
  })

  it('many long-name compositions stay S1-valid and ≤64', () => {
    const long = (n: string) =>
      baseSkill({
        name: n,
        description: 'd',
        systemPrompt: 'prompt body for composition of long skill names',
      })
    const skills = [
      long('very_long_skill_name_alpha_aaaaaaaa'),
      long('very_long_skill_name_beta_bbbbbbbbb'),
      long('very_long_skill_name_gamma_cccccccc'),
      long('very_long_skill_name_delta_dddddddd'),
    ]
    const first = composeSkills(...skills)
    const second = composeSkills(...skills)
    expect(first.name).toBe(second.name)
    expect(first.name).toMatch(SKILL_NAME_RE)
    expect(first.name.length).toBeLessThanOrEqual(64)
    expect(first.name).not.toContain('+')
  })

  it('creates composed description mentioning inputs', () => {
    const result = composeSkills(researcher, coder)
    expect(result.description).toContain('researcher')
    expect(result.description).toContain('coder')
  })

  it('concatenates system prompts with delimiters', () => {
    const result = composeSkills(researcher, coder)
    expect(result.systemPrompt).toContain('--- researcher ---')
    expect(result.systemPrompt).toContain('--- coder ---')
    expect(result.systemPrompt).toContain(researcher.systemPrompt)
    expect(result.systemPrompt).toContain(coder.systemPrompt)
  })

  it('merges and deduplicates tools (copy, not alias)', () => {
    const a = baseSkill({ name: 'a', tools: ['web_search', 'read_file'] })
    const b = baseSkill({ name: 'b', tools: ['read_file', 'shell'] })
    const result = composeSkills(a, b)
    expect(result.tools).toEqual(['web_search', 'read_file', 'shell'])
    result.tools!.push('extra')
    expect(a.tools).toEqual(['web_search', 'read_file'])
    expect(b.tools).toEqual(['read_file', 'shell'])
  })

  it('merges and deduplicates tools from built-ins', () => {
    const result = composeSkills(researcher, coder)
    expect(result.tools).toContain('web_search')
    expect(result.tools).toContain('read_file')
    expect(result.tools).toContain('write_file')
    expect(result.tools).toContain('shell')
    const unique = new Set(result.tools)
    expect(unique.size).toBe(result.tools!.length)
  })

  it('merges and deduplicates delegates', () => {
    const result = composeSkills(planner, researcher)
    expect(result.delegates).toContain('researcher')
    expect(result.delegates).toContain('coder')
    const unique = new Set(result.delegates)
    expect(unique.size).toBe(result.delegates!.length)
  })

  it('concatenates examples copied by value (not shared object identity)', () => {
    const a = baseSkill({
      name: 'a',
      examples: [{ input: 'a-in', output: 'a-out' }],
    })
    const b = baseSkill({
      name: 'b',
      examples: [{ input: 'b-in', output: 'b-out' }],
    })
    const result = composeSkills(a, b)
    expect(result.examples!.length).toBe(2)
    expect(result.examples![0]).not.toBe(a.examples![0])
    expect(result.examples![1]).not.toBe(b.examples![0])
    result.examples![0]!.input = 'MUTATED'
    expect(a.examples![0]!.input).toBe('a-in')
  })

  it('concatenates examples from built-ins', () => {
    const result = composeSkills(researcher, coder)
    expect(result.examples!.length).toBe(
      researcher.examples!.length + coder.examples!.length,
    )
  })

  it('last defined temperature wins', () => {
    const a = baseSkill({ name: 'a', temperature: 0.2 })
    const b = baseSkill({ name: 'b' }) // undefined
    const c = baseSkill({ name: 'c', temperature: 1.1 })
    expect(composeSkills(a, b).temperature).toBe(0.2)
    expect(composeSkills(a, c).temperature).toBe(1.1)
    expect(composeSkills(c, a).temperature).toBe(0.2)
  })

  it('leaves temperature undefined when no skill defines it', () => {
    const result = composeSkills(researcher, coder)
    expect(result.temperature).toBeUndefined()
  })

  it('merges metadata with last-key precedence without aliasing nested JSON data', () => {
    const a = baseSkill({
      name: 'a',
      metadata: { shared: 'from-a', onlyA: 1, nested: { x: 1, y: 1 } },
    })
    const b = baseSkill({
      name: 'b',
      metadata: { shared: 'from-b', onlyB: 2, nested: { x: 2, z: 3 } },
    })
    const result = composeSkills(a, b)
    expect(result.metadata).toEqual({
      shared: 'from-b',
      onlyA: 1,
      onlyB: 2,
      nested: { x: 2, z: 3 },
    })
    // No aliasing of nested objects back to inputs.
    expect(result.metadata).not.toBe(a.metadata)
    expect(result.metadata).not.toBe(b.metadata)
    expect(result.metadata!.nested).not.toBe(a.metadata!.nested)
    expect(result.metadata!.nested).not.toBe(b.metadata!.nested)
    ;(result.metadata!.nested as { x: number }).x = 99
    expect((a.metadata!.nested as { x: number }).x).toBe(1)
    expect((b.metadata!.nested as { x: number }).x).toBe(2)
  })

  it('rejects malformed skill name with typed AgentsKit config/skill error', () => {
    const bad = baseSkill({ name: 'bad name with spaces!' })
    try {
      composeSkills(bad)
      expect.unreachable('should have thrown')
    } catch (err) {
      expectConfigOrSkillError(err)
    }
  })

  it('rejects empty description with typed AgentsKit config/skill error', () => {
    const bad = baseSkill({ name: 'ok_name', description: '   ' })
    try {
      composeSkills(bad)
      expect.unreachable('should have thrown')
    } catch (err) {
      expectConfigOrSkillError(err)
    }
  })

  it('rejects empty systemPrompt with typed AgentsKit config/skill error', () => {
    const bad = baseSkill({ name: 'ok_name', systemPrompt: '' })
    try {
      composeSkills(bad)
      expect.unreachable('should have thrown')
    } catch (err) {
      expectConfigOrSkillError(err)
    }
  })

  it('rejects out-of-range temperature with typed AgentsKit config/skill error', () => {
    const low = baseSkill({ name: 'ok_name', temperature: -0.1 })
    const high = baseSkill({ name: 'ok_name', temperature: 2.01 })
    for (const bad of [low, high]) {
      try {
        composeSkills(bad)
        expect.unreachable('should have thrown')
      } catch (err) {
        expectConfigOrSkillError(err)
      }
    }
  })

  it('sets tools to undefined when composed skills contribute no tools', () => {
    const a = baseSkill({ name: 'a', tools: [] })
    const b = baseSkill({ name: 'b', tools: undefined })
    const result = composeSkills(a, b)
    expect(result.tools === undefined || result.tools.length === 0).toBe(true)
  })

  it('composes three skills with S1-valid name and sectioned prompts', () => {
    const result = composeSkills(researcher, coder, summarizer)
    expect(result.name).toMatch(SKILL_NAME_RE)
    expect(result.name.length).toBeLessThanOrEqual(64)
    expect(result.name).not.toContain('+')
    expect(result.systemPrompt).toContain('--- researcher ---')
    expect(result.systemPrompt).toContain('--- coder ---')
    expect(result.systemPrompt).toContain('--- summarizer ---')
  })

  it('onActivate is undefined when no input skills have onActivate', () => {
    const result = composeSkills(researcher, coder)
    expect(result.onActivate).toBeUndefined()
  })

  it('composed onActivate merges real ToolDefinition fixtures and preserves order of first occurrence', async () => {
    const toolA1 = makeTool('tool_a1')
    const toolA2 = makeTool('tool_a2')
    const toolB1 = makeTool('tool_b1')
    const skillA: SkillDefinition = {
      name: 'a',
      description: 'A',
      systemPrompt: 'A prompt',
      onActivate: async () => ({ tools: [toolA1, toolA2] }),
    }
    const skillB: SkillDefinition = {
      name: 'b',
      description: 'B',
      systemPrompt: 'B prompt',
      onActivate: async () => ({ tools: [toolB1] }),
    }
    const result = composeSkills(skillA, skillB)
    expect(result.onActivate).toBeTypeOf('function')
    const activation = await result.onActivate!()
    expect(activation.tools).toHaveLength(3)
    expect(activation.tools!.map(t => t.name)).toEqual(['tool_a1', 'tool_a2', 'tool_b1'])
    expect(activation.tools![0]).toBe(toolA1)
    expect(activation.tools![2]).toBe(toolB1)
  })

  it('composed onActivate deduplicates same-name dynamic tools with last definition wins', async () => {
    const first = makeTool('shared', 'first')
    const second = makeTool('shared', 'second-wins')
    const other = makeTool('other')
    const skillA: SkillDefinition = {
      name: 'a',
      description: 'A',
      systemPrompt: 'A prompt',
      onActivate: async () => ({ tools: [first, other] }),
    }
    const skillB: SkillDefinition = {
      name: 'b',
      description: 'B',
      systemPrompt: 'B prompt',
      onActivate: async () => ({ tools: [second] }),
    }
    const result = composeSkills(skillA, skillB)
    const activation = await result.onActivate!()
    const shared = activation.tools!.filter(t => t.name === 'shared')
    expect(shared).toHaveLength(1)
    expect(shared[0]).toBe(second)
    expect(shared[0]!.description).toBe('second-wins')
    expect(activation.tools!.some(t => t.name === 'other')).toBe(true)
  })

  it('onActivate is defined and calls only skills that have it', async () => {
    const dynamic = makeTool('dynamic_tool')
    const withHook: SkillDefinition = {
      name: 'with',
      description: 'With hook',
      systemPrompt: 'With prompt',
      onActivate: async () => ({ tools: [dynamic] }),
    }
    const withoutHook: SkillDefinition = {
      name: 'without',
      description: 'Without hook',
      systemPrompt: 'Without prompt',
    }
    const result = composeSkills(withHook, withoutHook)
    expect(result.onActivate).toBeTypeOf('function')
    const activation = await result.onActivate!()
    expect(activation.tools).toHaveLength(1)
    expect(activation.tools![0]).toBe(dynamic)
  })

  it('onActivate returns tools: undefined when all onActivate handlers return no tools', async () => {
    const skillA: SkillDefinition = {
      name: 'a',
      description: 'A',
      systemPrompt: 'A prompt',
      onActivate: async () => ({}),
    }
    const skillB: SkillDefinition = {
      name: 'b',
      description: 'B',
      systemPrompt: 'B prompt',
      onActivate: async () => ({ tools: [] }),
    }
    const result = composeSkills(skillA, skillB)
    const activation = await result.onActivate!()
    expect(activation.tools).toBeUndefined()
  })

  it('one onActivate failure rejects without returning partial tools', async () => {
    const okTool = makeTool('ok_tool')
    const skillOk: SkillDefinition = {
      name: 'ok',
      description: 'Ok',
      systemPrompt: 'Ok prompt',
      onActivate: async () => ({ tools: [okTool] }),
    }
    const skillFail: SkillDefinition = {
      name: 'fail',
      description: 'Fail',
      systemPrompt: 'Fail prompt',
      onActivate: async () => {
        throw new Error('activate boom')
      },
    }
    const result = composeSkills(skillOk, skillFail)
    await expect(result.onActivate!()).rejects.toThrow(/activate boom/)
  })
})
