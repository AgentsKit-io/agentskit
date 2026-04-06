import { describe, it, expect } from 'vitest'
import { createToolTemplate, createSkillTemplate, createAdapterTemplate } from '../src/factories'

describe('createToolTemplate', () => {
  it('creates a valid ToolDefinition', () => {
    const tool = createToolTemplate({
      name: 'my-tool',
      description: 'Does something',
      schema: { type: 'object', properties: { input: { type: 'string' } } },
      execute: async () => 'result',
    })
    expect(tool.name).toBe('my-tool')
    expect(tool.description).toBe('Does something')
    expect(tool.execute).toBeTypeOf('function')
  })

  it('throws without name', () => {
    expect(() => createToolTemplate({
      name: '',
      description: 'x',
      schema: { type: 'object' },
      execute: async () => 'x',
    })).toThrow('name')
  })

  it('throws without description', () => {
    expect(() => createToolTemplate({
      name: 'test',
      schema: { type: 'object' },
      execute: async () => 'x',
    })).toThrow('description')
  })

  it('throws without schema', () => {
    expect(() => createToolTemplate({
      name: 'test',
      description: 'x',
      execute: async () => 'x',
    })).toThrow('schema')
  })

  it('throws without execute', () => {
    expect(() => createToolTemplate({
      name: 'test',
      description: 'x',
      schema: { type: 'object' },
    })).toThrow('execute')
  })

  it('inherits from base tool', () => {
    const base = createToolTemplate({
      name: 'base',
      description: 'Base tool',
      schema: { type: 'object', properties: { q: { type: 'string' } } },
      execute: async () => 'base result',
      tags: ['search'],
      category: 'retrieval',
    })

    const extended = createToolTemplate({
      base,
      name: 'extended',
      description: 'Extended tool',
    })

    expect(extended.name).toBe('extended')
    expect(extended.description).toBe('Extended tool')
    expect(extended.tags).toEqual(['search'])
    expect(extended.category).toBe('retrieval')
    expect(extended.execute).toBe(base.execute)
    expect(extended.schema).toBe(base.schema)
  })

  it('overrides base fields', () => {
    const base = createToolTemplate({
      name: 'base',
      description: 'Base',
      schema: { type: 'object' },
      execute: async () => 'old',
      tags: ['old'],
    })

    const newExecute = async () => 'new'
    const extended = createToolTemplate({
      base,
      name: 'new',
      tags: ['new'],
      execute: newExecute,
    })

    expect(extended.tags).toEqual(['new'])
    expect(extended.execute).toBe(newExecute)
  })
})

describe('createSkillTemplate', () => {
  it('creates a valid SkillDefinition', () => {
    const skill = createSkillTemplate({
      name: 'my-skill',
      description: 'Does AI things',
      systemPrompt: 'You are a helpful assistant.',
    })
    expect(skill.name).toBe('my-skill')
    expect(skill.systemPrompt).toContain('helpful')
  })

  it('throws without name', () => {
    expect(() => createSkillTemplate({
      name: '',
      description: 'x',
      systemPrompt: 'x',
    })).toThrow('name')
  })

  it('throws without description', () => {
    expect(() => createSkillTemplate({
      name: 'test',
      systemPrompt: 'x',
    })).toThrow('description')
  })

  it('throws without systemPrompt', () => {
    expect(() => createSkillTemplate({
      name: 'test',
      description: 'x',
    })).toThrow('systemPrompt')
  })

  it('inherits from base skill', () => {
    const base = createSkillTemplate({
      name: 'base',
      description: 'Base skill',
      systemPrompt: 'You are base.',
      tools: ['web_search'],
      delegates: ['coder'],
    })

    const extended = createSkillTemplate({
      base,
      name: 'extended',
      temperature: 0.3,
    })

    expect(extended.name).toBe('extended')
    expect(extended.description).toBe('Base skill')
    expect(extended.systemPrompt).toBe('You are base.')
    expect(extended.tools).toEqual(['web_search'])
    expect(extended.delegates).toEqual(['coder'])
    expect(extended.temperature).toBe(0.3)
  })

  it('overrides base systemPrompt', () => {
    const base = createSkillTemplate({
      name: 'base',
      description: 'Base',
      systemPrompt: 'Original prompt.',
    })

    const extended = createSkillTemplate({
      base,
      name: 'custom',
      systemPrompt: 'Original prompt.\nAlways cite sources.',
    })

    expect(extended.systemPrompt).toContain('cite sources')
  })
})

describe('createAdapterTemplate', () => {
  it('creates a valid AdapterFactory', () => {
    const adapter = createAdapterTemplate({
      name: 'my-adapter',
      createSource: () => ({
        stream: async function* () { yield { type: 'done' as const } },
        abort: () => {},
      }),
    })
    expect(adapter.name).toBe('my-adapter')
    expect(adapter.createSource).toBeTypeOf('function')
  })

  it('throws without createSource', () => {
    expect(() => createAdapterTemplate({
      name: 'bad',
      createSource: undefined as never,
    })).toThrow('createSource')
  })
})
