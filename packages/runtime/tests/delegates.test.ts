import { describe, it, expect, vi } from 'vitest'
import type { SkillDefinition } from '@agentskit/core'
import { buildDelegateTools } from '../src/delegates'
import type { DelegateConfig } from '../src/types'

describe('buildDelegateTools', () => {
  const researcherSkill: SkillDefinition = {
    name: 'researcher',
    description: 'Researches topics thoroughly',
    systemPrompt: 'You are a researcher.',
  }

  const coderSkill: SkillDefinition = {
    name: 'coder',
    description: 'Writes clean code',
    systemPrompt: 'You are a coder.',
  }

  it('generates one ToolDefinition per delegate', () => {
    const delegates: Record<string, DelegateConfig> = {
      researcher: { skill: researcherSkill },
      coder: { skill: coderSkill },
    }

    const tools = buildDelegateTools(delegates, vi.fn())
    expect(tools).toHaveLength(2)
    expect(tools.map(t => t.name).sort()).toEqual(['delegate_coder', 'delegate_researcher'])
  })

  it('each tool has name, description, and schema', () => {
    const delegates: Record<string, DelegateConfig> = {
      researcher: { skill: researcherSkill },
    }

    const tools = buildDelegateTools(delegates, vi.fn())
    const tool = tools[0]

    expect(tool.name).toBe('delegate_researcher')
    expect(tool.description).toContain('Researches topics thoroughly')
    expect(tool.schema).toEqual({
      type: 'object',
      properties: {
        task: { type: 'string', description: 'The task to delegate to researcher' },
      },
      required: ['task'],
    })
  })

  it('execute calls the runDelegate callback with correct args', async () => {
    const runDelegate = vi.fn().mockResolvedValue({ content: 'research result' })
    const delegates: Record<string, DelegateConfig> = {
      researcher: { skill: researcherSkill },
    }

    const tools = buildDelegateTools(delegates, runDelegate)
    const result = await tools[0].execute!({ task: 'find papers on AI' }, { messages: [], call: {} as never })

    expect(runDelegate).toHaveBeenCalledWith('researcher', delegates.researcher, 'find papers on AI')
    expect(result).toBe('research result')
  })
})
