import { describe, it, expect } from 'vitest'
import type { SkillDefinition, ToolCall, ToolDefinition } from '../src/types'
import { buildToolMap, activateSkills, executeSafeTool } from '../src/agent-loop'
import { createEventEmitter, createToolLifecycle } from '../src/primitives'

describe('buildToolMap', () => {
  it('builds a map from tool arrays', () => {
    const tools: ToolDefinition[] = [
      { name: 'a', execute: async () => 'a' },
      { name: 'b', execute: async () => 'b' },
    ]
    const map = buildToolMap(tools)
    expect(map.size).toBe(2)
    expect(map.get('a')?.name).toBe('a')
  })

  it('later sources override earlier ones by name', () => {
    const first: ToolDefinition[] = [{ name: 'search', description: 'v1', execute: async () => 'v1' }]
    const second: ToolDefinition[] = [{ name: 'search', description: 'v2', execute: async () => 'v2' }]
    const map = buildToolMap(first, second)
    expect(map.size).toBe(1)
    expect(map.get('search')?.description).toBe('v2')
  })

  it('handles undefined sources', () => {
    const tools: ToolDefinition[] = [{ name: 'a', execute: async () => 'a' }]
    const map = buildToolMap(undefined, tools, undefined)
    expect(map.size).toBe(1)
  })

  it('returns empty map for no sources', () => {
    const map = buildToolMap()
    expect(map.size).toBe(0)
  })
})

describe('activateSkills', () => {
  it('returns base prompt when no skills', async () => {
    const result = await activateSkills([], 'You are helpful.')
    expect(result.systemPrompt).toBe('You are helpful.')
    expect(result.skillTools).toEqual([])
  })

  it('merges skill prompts with base prompt', async () => {
    const skills: SkillDefinition[] = [
      { name: 'researcher', description: 'r', systemPrompt: 'Research things.' },
      { name: 'coder', description: 'c', systemPrompt: 'Write code.' },
    ]
    const result = await activateSkills(skills, 'Base prompt.')
    expect(result.systemPrompt).toContain('Base prompt.')
    expect(result.systemPrompt).toContain('--- researcher ---')
    expect(result.systemPrompt).toContain('Research things.')
    expect(result.systemPrompt).toContain('--- coder ---')
    expect(result.systemPrompt).toContain('Write code.')
  })

  it('calls onActivate and collects tools', async () => {
    const skillTool: ToolDefinition = { name: 'web_search', execute: async () => 'found' }
    const skills: SkillDefinition[] = [{
      name: 'researcher',
      description: 'r',
      systemPrompt: 'Research.',
      onActivate: async () => ({ tools: [skillTool] }),
    }]
    const result = await activateSkills(skills)
    expect(result.skillTools).toHaveLength(1)
    expect(result.skillTools[0].name).toBe('web_search')
  })

  it('handles skills without onActivate', async () => {
    const skills: SkillDefinition[] = [
      { name: 'simple', description: 's', systemPrompt: 'Simple.' },
    ]
    const result = await activateSkills(skills)
    expect(result.skillTools).toEqual([])
  })
})

describe('executeSafeTool', () => {
  function makeToolCall(name: string): ToolCall {
    return { id: 'tc1', name, args: { q: 'test' }, status: 'pending' }
  }

  it('executes tool and returns complete result', async () => {
    const tool: ToolDefinition = { name: 'search', execute: async () => 'found it' }
    const emitter = createEventEmitter()
    const toolMap = buildToolMap([tool])
    const lifecycle = createToolLifecycle(toolMap)
    const events: unknown[] = []
    emitter.addObserver({ name: 'test', on: (e) => { events.push(e) } })

    const result = await executeSafeTool({
      tool,
      toolCall: makeToolCall('search'),
      context: { messages: [], call: makeToolCall('search') },
      emitter,
      lifecycle,
    })

    expect(result.status).toBe('complete')
    expect(result.result).toBe('found it')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(events.some((e: Record<string, unknown>) => e.type === 'tool:start')).toBe(true)
    expect(events.some((e: Record<string, unknown>) => e.type === 'tool:end')).toBe(true)
  })

  it('returns error for missing tool', async () => {
    const emitter = createEventEmitter()
    const toolMap = buildToolMap()
    const lifecycle = createToolLifecycle(toolMap)
    const events: unknown[] = []
    emitter.addObserver({ name: 'test', on: (e) => { events.push(e) } })

    const result = await executeSafeTool({
      tool: undefined,
      toolCall: makeToolCall('nonexistent'),
      context: { messages: [], call: makeToolCall('nonexistent') },
      emitter,
      lifecycle,
    })

    expect(result.status).toBe('error')
    expect(result.error).toContain('not found')
    expect(events.some((e: Record<string, unknown>) => e.type === 'error')).toBe(true)
  })

  it('rejects invalid args with AK_TOOL_INVALID_INPUT when a validator is supplied (ADR-0008)', async () => {
    let executed = false
    const tool: ToolDefinition = {
      name: 'search',
      schema: { type: 'object', properties: { q: { type: 'number' } }, required: ['q'] },
      execute: async () => { executed = true; return 'ran' },
    }
    const emitter = createEventEmitter()
    const lifecycle = createToolLifecycle(buildToolMap([tool]))

    const result = await executeSafeTool({
      tool,
      toolCall: { id: 'tc1', name: 'search', args: { q: 'not-a-number' }, status: 'pending' },
      context: { messages: [], call: makeToolCall('search') },
      emitter,
      lifecycle,
      validate: () => ({ valid: false, message: 'invalid tool arguments: q: must be number' }),
    })

    expect(result.status).toBe('error')
    expect(result.error).toContain('AK_TOOL_INVALID_INPUT')
    expect(result.error).toContain('q: must be number')
    expect(executed).toBe(false)
  })

  it('executes when the validator passes', async () => {
    const tool: ToolDefinition = {
      name: 'search',
      schema: { type: 'object', properties: { q: { type: 'string' } } },
      execute: async () => 'ok',
    }
    const emitter = createEventEmitter()
    const lifecycle = createToolLifecycle(buildToolMap([tool]))

    const result = await executeSafeTool({
      tool,
      toolCall: makeToolCall('search'),
      context: { messages: [], call: makeToolCall('search') },
      emitter,
      lifecycle,
      validate: () => ({ valid: true }),
    })

    expect(result.status).toBe('complete')
    expect(result.result).toBe('ok')
  })

  it('passes through when validator is set but tool has no schema', async () => {
    const tool: ToolDefinition = { name: 'search', execute: async () => 'ok' }
    const emitter = createEventEmitter()
    const lifecycle = createToolLifecycle(buildToolMap([tool]))
    let called = false

    const result = await executeSafeTool({
      tool,
      toolCall: makeToolCall('search'),
      context: { messages: [], call: makeToolCall('search') },
      emitter,
      lifecycle,
      validate: () => { called = true; return { valid: false } },
    })

    expect(result.status).toBe('complete')
    expect(called).toBe(false)
  })

  it('catches tool execution errors', async () => {
    const tool: ToolDefinition = {
      name: 'flaky',
      execute: async () => { throw new Error('API timeout') },
    }
    const emitter = createEventEmitter()
    const toolMap = buildToolMap([tool])
    const lifecycle = createToolLifecycle(toolMap)

    const result = await executeSafeTool({
      tool,
      toolCall: makeToolCall('flaky'),
      context: { messages: [], call: makeToolCall('flaky') },
      emitter,
      lifecycle,
    })

    expect(result.status).toBe('error')
    expect(result.error).toContain('API timeout')
  })

  it('emits error before tool:end on failed tool execution', async () => {
    const tool: ToolDefinition = {
      name: 'flaky',
      execute: async () => { throw new Error('API timeout') },
    }
    const emitter = createEventEmitter()
    const lifecycle = createToolLifecycle(buildToolMap([tool]))
    const types: string[] = []
    emitter.addObserver({ name: 'test', on: (e) => { types.push(e.type) } })

    const result = await executeSafeTool({
      tool,
      toolCall: makeToolCall('flaky'),
      context: { messages: [], call: makeToolCall('flaky') },
      emitter,
      lifecycle,
    })

    expect(result.status).toBe('error')
    expect(types).toEqual(['tool:start', 'error', 'tool:end'])
  })

  it('calls onPartial during streaming execution', async () => {
    const tool: ToolDefinition = {
      name: 'streamer',
      execute: async function* () {
        yield 'chunk1'
        yield 'chunk2'
      } as unknown as ToolDefinition['execute'],
    }
    const emitter = createEventEmitter()
    const toolMap = buildToolMap([tool])
    const lifecycle = createToolLifecycle(toolMap)
    const partials: string[] = []

    const result = await executeSafeTool({
      tool,
      toolCall: makeToolCall('streamer'),
      context: { messages: [], call: makeToolCall('streamer') },
      emitter,
      lifecycle,
      onPartial: (p) => partials.push(p),
    })

    expect(result.status).toBe('complete')
    expect(partials.length).toBeGreaterThan(0)
  })

  it('respects onConfirm callback for requiresConfirmation tools', async () => {
    const tool: ToolDefinition = {
      name: 'dangerous',
      requiresConfirmation: true,
      execute: async () => 'executed',
    }
    const emitter = createEventEmitter()
    const toolMap = buildToolMap([tool])
    const lifecycle = createToolLifecycle(toolMap)

    // Confirm = true → executes
    const confirmed = await executeSafeTool({
      tool,
      toolCall: makeToolCall('dangerous'),
      context: { messages: [], call: makeToolCall('dangerous') },
      emitter,
      lifecycle,
      onConfirm: async () => true,
    })
    expect(confirmed.status).toBe('complete')
    expect(confirmed.result).toBe('executed')

    // Confirm = false → skipped
    const denied = await executeSafeTool({
      tool,
      toolCall: makeToolCall('dangerous'),
      context: { messages: [], call: makeToolCall('dangerous') },
      emitter,
      lifecycle,
      onConfirm: async () => false,
    })
    expect(denied.status).toBe('skipped')
  })

  it('refuses when requiresConfirmation and no onConfirm callback is provided', async () => {
    let executed = false
    const tool: ToolDefinition = {
      name: 'dangerous',
      requiresConfirmation: true,
      execute: async () => {
        executed = true
        return 'should-not-run'
      },
    }
    const emitter = createEventEmitter()
    const toolMap = buildToolMap([tool])
    const lifecycle = createToolLifecycle(toolMap)

    const result = await executeSafeTool({
      tool,
      toolCall: makeToolCall('dangerous'),
      context: { messages: [], call: makeToolCall('dangerous') },
      emitter,
      lifecycle,
    })
    expect(executed).toBe(false)
    expect(result.status).toBe('skipped')
    expect(result.result?.toLowerCase()).toMatch(/confirm|refus|approv|declin/)
    expect(result.result?.toLowerCase()).toContain('handler')
  })
})
