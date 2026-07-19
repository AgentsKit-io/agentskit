import { describe, it, expect } from 'vitest'
import { ConfigError } from '@agentskit/core'
import {
  createToolTemplate,
  createSkillTemplate,
  createAdapterTemplate,
} from '../src/factories'
import {
  validateToolTemplate,
  validateSkillTemplate,
  validateAdapterTemplate,
} from '../src/validate'

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
    expect(() =>
      createToolTemplate({
        name: '',
        description: 'x',
        schema: { type: 'object' },
        execute: async () => 'x',
      }),
    ).toThrow('name')
  })

  it('throws on whitespace-only description', () => {
    expect(() =>
      createToolTemplate({
        name: 'test',
        description: '   ',
        schema: { type: 'object' },
        execute: async () => 'x',
      }),
    ).toThrow('description')
  })

  it('throws without schema', () => {
    expect(() =>
      createToolTemplate({
        name: 'test',
        description: 'x',
        execute: async () => 'x',
      }),
    ).toThrow('schema')
  })

  it('rejects null and array schema', () => {
    expect(() =>
      createToolTemplate({
        name: 'test',
        description: 'x',
        schema: null as unknown as Record<string, unknown>,
        execute: async () => 'x',
      }),
    ).toThrow('schema')
    expect(() =>
      createToolTemplate({
        name: 'test',
        description: 'x',
        schema: [] as unknown as Record<string, unknown>,
        execute: async () => 'x',
      }),
    ).toThrow('schema')
  })

  it('rejects non-plain schema objects', () => {
    expect(() =>
      validateToolTemplate({
        name: 'test',
        description: 'x',
        schema: new Date(),
        execute: async () => 'x',
      }),
    ).toThrow(/schema/)
  })

  it('accepts JSON Schema object without type field', () => {
    const tool = createToolTemplate({
      name: 'untyped-schema',
      description: 'schema without type',
      schema: { properties: { q: { type: 'string' } } },
      execute: async () => 'ok',
    })
    expect(tool.schema).toEqual({ properties: { q: { type: 'string' } } })
  })

  it('throws without execute', () => {
    expect(() =>
      createToolTemplate({
        name: 'test',
        description: 'x',
        schema: { type: 'object' },
      }),
    ).toThrow('execute')
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
    expect(() =>
      createSkillTemplate({
        name: '',
        description: 'x',
        systemPrompt: 'x',
      }),
    ).toThrow('name')
  })

  it('throws without description', () => {
    expect(() =>
      createSkillTemplate({
        name: 'test',
        systemPrompt: 'x',
      }),
    ).toThrow('description')
  })

  it('throws without systemPrompt', () => {
    expect(() =>
      createSkillTemplate({
        name: 'test',
        description: 'x',
      }),
    ).toThrow('systemPrompt')
  })

  it('rejects non-finite temperature', () => {
    expect(() =>
      createSkillTemplate({
        name: 'test',
        description: 'x',
        systemPrompt: 'x',
        temperature: Number.NaN,
      }),
    ).toThrow(/temperature/)
    expect(() =>
      createSkillTemplate({
        name: 'test',
        description: 'x',
        systemPrompt: 'x',
        temperature: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(/temperature/)
  })

  it('accepts finite temperature outside common 0-1 ranges', () => {
    const skill = createSkillTemplate({
      name: 'hot',
      description: 'x',
      systemPrompt: 'x',
      temperature: 2,
    })
    expect(skill.temperature).toBe(2)
  })

  it('passes metadata through', () => {
    const skill = createSkillTemplate({
      name: 'meta',
      description: 'x',
      systemPrompt: 'x',
      metadata: { team: 'platform', tier: 1 },
    })
    expect(skill.metadata).toEqual({ team: 'platform', tier: 1 })
  })

  it('inherits metadata and tools from base skill', () => {
    const base = createSkillTemplate({
      name: 'base',
      description: 'Base skill',
      systemPrompt: 'You are base.',
      tools: ['web_search'],
      delegates: ['coder'],
      metadata: { origin: 'base' },
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
    expect(extended.metadata).toEqual({ origin: 'base' })
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
        stream: async function* () {
          yield { type: 'done' as const }
        },
        abort: () => {},
      }),
    })
    expect(adapter.name).toBe('my-adapter')
    expect(adapter.createSource).toBeTypeOf('function')
  })

  it('passes capabilities through', () => {
    const adapter = createAdapterTemplate({
      name: 'caps',
      capabilities: { tools: true, streaming: true },
      createSource: () => ({
        stream: async function* () {
          yield { type: 'done' as const }
        },
        abort: () => {},
      }),
    })
    expect(adapter.capabilities).toEqual({ tools: true, streaming: true })
  })

  it('throws without createSource', () => {
    expect(() =>
      createAdapterTemplate({
        name: 'bad',
        createSource: undefined as never,
      }),
    ).toThrow('createSource')
  })

  it('throws without name', () => {
    expect(() =>
      createAdapterTemplate({
        name: '  ',
        createSource: () => ({
          stream: async function* () {
            yield { type: 'done' as const }
          },
          abort: () => {},
        }),
      }),
    ).toThrow(/name/)
  })

  it('validateAdapterTemplate rejects non-objects', () => {
    expect(() => validateAdapterTemplate(null)).toThrow(ConfigError)
    expect(() => validateAdapterTemplate('x')).toThrow(ConfigError)
    expect(() => validateAdapterTemplate([])).toThrow(ConfigError)
  })
})

describe('validators directly', () => {
  it('returns typed errors for null tool and skill values', () => {
    expect(() => validateToolTemplate(null)).toThrow(ConfigError)
    expect(() => validateSkillTemplate(null)).toThrow(ConfigError)
  })
  it('validateToolTemplate rejects non-function execute', () => {
    expect(() =>
      validateToolTemplate({
        name: 't',
        description: 'd',
        schema: { type: 'object' },
        execute: 'nope' as never,
      }),
    ).toThrow(/execute/)
  })

  it('validateSkillTemplate rejects whitespace systemPrompt', () => {
    expect(() =>
      validateSkillTemplate({
        name: 's',
        description: 'd',
        systemPrompt: '\t\n',
      }),
    ).toThrow(/systemPrompt/)
  })
})
