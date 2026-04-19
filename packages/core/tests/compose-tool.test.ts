import { describe, expect, it, vi } from 'vitest'
import { composeTool } from '../src/compose-tool'
import type { ToolDefinition } from '../src/types/tool'

function tool(
  name: string,
  run: (args: Record<string, unknown>) => unknown | Promise<unknown>,
): ToolDefinition {
  return { name, description: name, execute: async args => run(args) }
}

const stubCtx = {
  messages: [],
  call: { id: 'c', name: 'x', args: {}, status: 'running' as const },
}

describe('composeTool', () => {
  it('rejects empty step list', () => {
    expect(() => composeTool({ name: 'empty', steps: [] })).toThrow(/at least one step/)
  })

  it('runs steps left-to-right, piping state', async () => {
    const double = tool('double', async ({ n }) => (n as number) * 2)
    const addOne = tool('add-one', async ({ n }) => (n as number) + 1)
    const macro = composeTool<{ start: number }>({
      name: 'macro',
      steps: [
        { tool: double, mapArgs: ({ args }) => ({ n: args.start }) },
        { tool: addOne, mapArgs: ({ state }) => ({ n: state as number }) },
      ],
    })
    expect(await macro.execute!({ start: 5 }, stubCtx)).toBe(11)
  })

  it('mapResult transforms the step output before storing', async () => {
    const macro = composeTool({
      name: 'macro',
      steps: [
        {
          tool: tool('returner', async () => ({ payload: 'hello' })),
          mapArgs: () => ({}),
          mapResult: (result: unknown) => (result as { payload: string }).payload.toUpperCase(),
        },
      ],
    })
    expect(await macro.execute!({}, stubCtx)).toBe('HELLO')
  })

  it('finalize reducer wraps every intermediate output', async () => {
    const macro = composeTool({
      name: 'macro',
      steps: [
        { tool: tool('a', async () => 1), mapArgs: () => ({}) },
        { tool: tool('b', async () => 2), mapArgs: () => ({}) },
      ],
      finalize: ({ prior }) => ({ sum: prior.reduce<number>((s, v) => s + (v as number), 0) }),
    })
    expect(await macro.execute!({}, stubCtx)).toEqual({ sum: 3 })
  })

  it('stopWhen short-circuits the remaining steps', async () => {
    const second = vi.fn(async () => 'never')
    const macro = composeTool({
      name: 'macro',
      steps: [
        {
          tool: tool('first', async () => 'done'),
          mapArgs: () => ({}),
          stopWhen: state => state === 'done',
        },
        { tool: { name: 'second', description: '', execute: second }, mapArgs: () => ({}) },
      ],
    })
    expect(await macro.execute!({}, stubCtx)).toBe('done')
    expect(second).not.toHaveBeenCalled()
  })

  it('throws when a step has no execute', async () => {
    const macro = composeTool({
      name: 'macro',
      steps: [{ tool: { name: 'broken', description: '' }, mapArgs: () => ({}) }],
    })
    await expect(macro.execute!({}, stubCtx)).rejects.toThrow(/has no execute/)
  })

  it('onStep fires start + end per step', async () => {
    const phases: string[] = []
    const macro = composeTool({
      name: 'macro',
      steps: [
        { tool: tool('a', async () => 1), mapArgs: () => ({}) },
        { tool: tool('b', async () => 2), mapArgs: () => ({}) },
      ],
      onStep: e => phases.push(`${e.step}:${e.phase}`),
    })
    await macro.execute!({}, stubCtx)
    expect(phases).toEqual(['0:start', '0:end', '1:start', '1:end'])
  })

  it('exposes schema + description + confirmation on the macro', () => {
    const macro = composeTool({
      name: 'macro',
      description: 'chains',
      schema: { type: 'object', properties: { q: { type: 'string' } } },
      requiresConfirmation: true,
      tags: ['chain'],
      category: 'macro',
      steps: [{ tool: tool('a', async () => null), mapArgs: () => ({}) }],
    })
    expect(macro.description).toBe('chains')
    expect(macro.requiresConfirmation).toBe(true)
    expect(macro.tags).toEqual(['chain'])
    expect(macro.category).toBe('macro')
    expect(macro.schema?.properties).toEqual({ q: { type: 'string' } })
  })

  it('mapArgs receives the macro args and prior results', async () => {
    const captured: Array<Record<string, unknown>> = []
    const macro = composeTool<{ id: string }>({
      name: 'macro',
      steps: [
        {
          tool: tool('fetch', async ({ id }) => ({ name: `user-${id}` })),
          mapArgs: ({ args }) => {
            captured.push({ id: args.id })
            return { id: args.id }
          },
        },
        {
          tool: tool('greet', async ({ name }) => `hi, ${name}`),
          mapArgs: ({ prior, state }) => {
            captured.push({ prior: prior.length, state })
            return { name: (state as { name: string }).name }
          },
        },
      ],
    })
    const result = await macro.execute!({ id: '42' }, stubCtx)
    expect(result).toBe('hi, user-42')
    expect(captured[0]).toEqual({ id: '42' })
    expect(captured[1]).toMatchObject({ prior: 1 })
  })
})
