import { describe, it, expect, expectTypeOf } from 'vitest'
import { defineTool } from '../src/types/tool'
import type { ToolDefinition, InferSchemaType } from '../src/types/tool'

describe('defineTool', () => {
  it('infers string property from as-const schema', () => {
    const tool = defineTool({
      name: 'weather',
      description: 'Get weather',
      schema: {
        type: 'object',
        properties: {
          city: { type: 'string' },
        },
        required: ['city'],
      } as const,
      execute: (args) => {
        // args.city should be string
        expectTypeOf(args.city).toBeString()
        return `Weather in ${args.city}`
      },
    })

    expect(tool.name).toBe('weather')
    expectTypeOf(tool).toMatchTypeOf<ToolDefinition>()
  })

  it('infers multiple property types', () => {
    const tool = defineTool({
      name: 'search',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
          verbose: { type: 'boolean' },
        },
        required: ['query'],
      } as const,
      execute: (args) => {
        expectTypeOf(args.query).toBeString()
        expectTypeOf(args.limit).toEqualTypeOf<number | undefined>()
        expectTypeOf(args.verbose).toEqualTypeOf<boolean | undefined>()
        return args.query
      },
    })

    expect(tool.name).toBe('search')
  })

  it('makes all properties optional when required is missing', () => {
    const tool = defineTool({
      name: 'optional-test',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      } as const,
      execute: (args) => {
        expectTypeOf(args.name).toEqualTypeOf<string | undefined>()
        return 'ok'
      },
    })

    expect(tool.name).toBe('optional-test')
  })

  it('works without a schema (falls back to Record<string, unknown>)', () => {
    const tool = defineTool({
      name: 'no-schema',
      execute: (args) => {
        expectTypeOf(args).toEqualTypeOf<Record<string, unknown>>()
        return 'ok'
      },
    })

    expect(tool.name).toBe('no-schema')
  })

  it('is backward compatible with untyped ToolDefinition', () => {
    // Existing code that uses ToolDefinition without generics should still work
    const tool: ToolDefinition = {
      name: 'legacy',
      schema: { type: 'object', properties: { q: { type: 'string' } } },
      execute: async (args) => {
        expectTypeOf(args).toEqualTypeOf<Record<string, unknown>>()
        return String(args.q)
      },
    }

    expect(tool.name).toBe('legacy')
  })

  it('defineTool result is assignable to ToolDefinition', () => {
    const typed = defineTool({
      name: 'typed',
      schema: {
        type: 'object',
        properties: { x: { type: 'number' } },
        required: ['x'],
      } as const,
      execute: (args) => args.x * 2,
    })

    // A typed tool should be assignable to the base ToolDefinition
    const base: ToolDefinition = typed as ToolDefinition
    expect(base.name).toBe('typed')
  })

  it('supports lifecycle methods alongside typed execute', () => {
    const tool = defineTool({
      name: 'stateful',
      schema: {
        type: 'object',
        properties: { input: { type: 'string' } },
        required: ['input'],
      } as const,
      init: async () => {},
      dispose: async () => {},
      execute: (args) => {
        expectTypeOf(args.input).toBeString()
        return args.input
      },
    })

    expect(tool.init).toBeDefined()
    expect(tool.dispose).toBeDefined()
  })

  it('supports tags and category', () => {
    const tool = defineTool({
      name: 'tagged',
      tags: ['web', 'search'],
      category: 'retrieval',
      schema: {
        type: 'object',
        properties: { q: { type: 'string' } },
        required: ['q'],
      } as const,
      execute: (args) => args.q,
    })

    expect(tool.tags).toEqual(['web', 'search'])
    expect(tool.category).toBe('retrieval')
  })

  it('infers integer as number', () => {
    defineTool({
      name: 'int-test',
      schema: {
        type: 'object',
        properties: { count: { type: 'integer' } },
        required: ['count'],
      } as const,
      execute: (args) => {
        expectTypeOf(args.count).toBeNumber()
        return args.count
      },
    })
  })

  it('infers array type', () => {
    defineTool({
      name: 'array-test',
      schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['items'],
      } as const,
      execute: (args) => {
        expectTypeOf(args.items).toEqualTypeOf<string[]>()
        return args.items.join(', ')
      },
    })
  })
})

describe('InferSchemaType', () => {
  it('infers correct types from a const schema', () => {
    type Schema = {
      type: 'object'
      properties: {
        name: { type: 'string' }
        age: { type: 'number' }
      }
      required: readonly ['name']
    }

    type Inferred = InferSchemaType<Schema>

    expectTypeOf<Inferred>().toHaveProperty('name')
    expectTypeOf<Inferred['name']>().toBeString()
  })

  it('falls back to Record<string, unknown> for non-object schemas', () => {
    type Schema = { type: 'string' }
    type Inferred = InferSchemaType<Schema>
    expectTypeOf<Inferred>().toEqualTypeOf<Record<string, unknown>>()
  })
})
