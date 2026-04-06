import { describe, it, expect } from 'vitest'
import type { SkillDefinition } from '@agentskit/core'
import { composeSkills } from '../src/compose'
import { researcher, coder, planner, summarizer } from '../src/index'

describe('composeSkills', () => {
  it('throws on zero skills', () => {
    expect(() => composeSkills()).toThrow('at least one skill')
  })

  it('returns the same skill when given one', () => {
    const result = composeSkills(researcher)
    expect(result).toBe(researcher)
  })

  it('merges names with +', () => {
    const result = composeSkills(researcher, coder)
    expect(result.name).toBe('researcher+coder')
  })

  it('creates composed description', () => {
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

  it('merges and deduplicates tools', () => {
    const result = composeSkills(researcher, coder)
    expect(result.tools).toContain('web_search')
    expect(result.tools).toContain('read_file')
    expect(result.tools).toContain('write_file')
    expect(result.tools).toContain('shell')
    // No duplicates
    const unique = new Set(result.tools)
    expect(unique.size).toBe(result.tools!.length)
  })

  it('merges and deduplicates delegates', () => {
    const result = composeSkills(planner, researcher)
    expect(result.delegates).toContain('researcher')
    expect(result.delegates).toContain('coder')
    // No duplicates even though planner delegates to researcher
    const unique = new Set(result.delegates)
    expect(unique.size).toBe(result.delegates!.length)
  })

  it('concatenates examples', () => {
    const result = composeSkills(researcher, coder)
    expect(result.examples!.length).toBe(
      researcher.examples!.length + coder.examples!.length
    )
  })

  it('leaves temperature undefined', () => {
    const result = composeSkills(researcher, coder)
    expect(result.temperature).toBeUndefined()
  })

  it('sets tools to undefined when all skills have empty tools', () => {
    const result = composeSkills(summarizer)
    // Single skill returns as-is
    expect(result.tools).toEqual([])
  })

  it('composes three skills', () => {
    const result = composeSkills(researcher, coder, summarizer)
    expect(result.name).toBe('researcher+coder+summarizer')
    expect(result.systemPrompt).toContain('--- researcher ---')
    expect(result.systemPrompt).toContain('--- coder ---')
    expect(result.systemPrompt).toContain('--- summarizer ---')
  })

  it('onActivate is undefined when no input skills have onActivate', () => {
    const result = composeSkills(researcher, coder)
    expect(result.onActivate).toBeUndefined()
  })

  it('onActivate merges tools from all skills that have it', async () => {
    const skillA: SkillDefinition = {
      name: 'a',
      description: 'A',
      systemPrompt: 'A prompt',
      onActivate: async () => ({ tools: ['tool_a1', 'tool_a2'] }),
    }
    const skillB: SkillDefinition = {
      name: 'b',
      description: 'B',
      systemPrompt: 'B prompt',
      onActivate: async () => ({ tools: ['tool_b1'] }),
    }
    const result = composeSkills(skillA, skillB)
    expect(result.onActivate).toBeTypeOf('function')
    const activation = await result.onActivate!()
    expect(activation.tools).toContain('tool_a1')
    expect(activation.tools).toContain('tool_a2')
    expect(activation.tools).toContain('tool_b1')
    expect(activation.tools!.length).toBe(3)
  })

  it('onActivate is defined and calls only skills that have it', async () => {
    const withHook: SkillDefinition = {
      name: 'with',
      description: 'With hook',
      systemPrompt: 'With prompt',
      onActivate: async () => ({ tools: ['dynamic_tool'] }),
    }
    const withoutHook: SkillDefinition = {
      name: 'without',
      description: 'Without hook',
      systemPrompt: 'Without prompt',
    }
    const result = composeSkills(withHook, withoutHook)
    expect(result.onActivate).toBeTypeOf('function')
    const activation = await result.onActivate!()
    expect(activation.tools).toEqual(['dynamic_tool'])
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
})
