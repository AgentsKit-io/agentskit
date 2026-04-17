import { describe, it, expect, expectTypeOf } from 'vitest'
import type { ToolDefinition } from '@agentskit/core'
import { defineZodTool } from '../src/zod'

// Minimal Zod-like mock for testing without a real zod dependency
function createMockZodSchema<T>(output: T) {
  return {
    parse: (data: unknown) => data as T,
    _output: output as T,
  }
}

describe('defineZodTool', () => {
  it('creates a valid ToolDefinition', () => {
    const schema = createMockZodSchema({ city: '' as string })

    const tool = defineZodTool({
      name: 'weather',
      description: 'Get weather',
      schema,
      execute: (args) => {
        expectTypeOf(args).toEqualTypeOf<{ city: string }>()
        return `Weather in ${args.city}`
      },
    })

    expect(tool.name).toBe('weather')
    expect(tool.description).toBe('Get weather')
  })

  it('is assignable to base ToolDefinition', () => {
    const schema = createMockZodSchema({ q: '' as string })

    const tool = defineZodTool({
      name: 'search',
      schema,
      execute: (args) => args.q,
    })

    const base: ToolDefinition = tool as ToolDefinition
    expect(base.name).toBe('search')
  })

  it('calls toJsonSchema when provided', () => {
    const schema = createMockZodSchema({ x: 0 as number })
    const jsonSchema = { type: 'object' as const, properties: { x: { type: 'number' as const } } }

    const tool = defineZodTool({
      name: 'with-json',
      schema,
      toJsonSchema: () => jsonSchema,
      execute: (args) => args.x,
    })

    expect(tool.schema).toEqual(jsonSchema)
  })

  it('validates args at runtime via schema.parse', async () => {
    let parseCalled = false

    const schema = {
      parse: (data: unknown) => {
        parseCalled = true
        return data as { value: string }
      },
      _output: { value: '' as string },
    }

    const tool = defineZodTool({
      name: 'validated',
      schema,
      execute: (args) => args.value,
    })

    const context = { messages: [], call: { id: '1', name: 'validated', args: {}, status: 'running' as const } }
    const result = await tool.execute!({ value: 'hello' } as Record<string, unknown>, context as never)

    expect(parseCalled).toBe(true)
    expect(result).toBe('hello')
  })

  it('supports lifecycle methods', () => {
    const schema = createMockZodSchema({ x: '' as string })

    const tool = defineZodTool({
      name: 'lifecycle',
      schema,
      init: async () => {},
      dispose: async () => {},
      execute: (args) => args.x,
    })

    expect(tool.init).toBeDefined()
    expect(tool.dispose).toBeDefined()
  })

  it('works without execute', () => {
    const schema = createMockZodSchema({ x: '' as string })

    const tool = defineZodTool({
      name: 'no-exec',
      schema,
    })

    expect(tool.name).toBe('no-exec')
    expect(tool.execute).toBeUndefined()
  })
})
