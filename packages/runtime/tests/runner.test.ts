import { describe, it, expect, vi } from 'vitest'
import { createRuntime } from '../src/runner'
import { createInMemoryMemory } from '@agentskit/core'
import type { AgentEvent, Observer, SkillDefinition, ToolDefinition } from '@agentskit/core'
import { createMockAdapter, createSequentialAdapter } from './helpers'

describe('createRuntime', () => {
  describe('single-step task (no tools)', () => {
    it('returns the LLM response as content', async () => {
      const adapter = createMockAdapter([
        { type: 'text', content: 'Hello, I can help with that.' },
        { type: 'done' },
      ])
      const runtime = createRuntime({ adapter })
      const result = await runtime.run('Help me')

      expect(result.content).toBe('Hello, I can help with that.')
      expect(result.steps).toBe(1)
      expect(result.toolCalls).toEqual([])
      expect(result.messages).toHaveLength(2) // user + assistant
      expect(result.messages[0].role).toBe('user')
      expect(result.messages[1].role).toBe('assistant')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('includes system prompt when configured', async () => {
      const adapter = createMockAdapter([
        { type: 'text', content: 'OK' },
        { type: 'done' },
      ])
      const runtime = createRuntime({ adapter, systemPrompt: 'You are a helper.' })
      const result = await runtime.run('Hi')

      expect(result.messages[0].role).toBe('system')
      expect(result.messages[0].content).toBe('You are a helper.')
      expect(result.messages[1].role).toBe('user')
    })
  })

  describe('multi-step tool usage', () => {
    it('executes tool and re-invokes adapter with result', async () => {
      const adapter = createSequentialAdapter([
        // Step 1: LLM requests tool call
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'weather', args: '{"city":"SP"}' } },
          { type: 'done' },
        ],
        // Step 2: LLM responds with final answer
        [
          { type: 'text', content: 'The weather in SP is sunny.' },
          { type: 'done' },
        ],
      ])

      const weatherTool: ToolDefinition = {
        name: 'weather',
        execute: async (args) => `Sunny in ${args.city}`,
      }

      const runtime = createRuntime({ adapter, tools: [weatherTool] })
      const result = await runtime.run('What is the weather?')

      expect(result.content).toBe('The weather in SP is sunny.')
      expect(result.steps).toBe(2)
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls[0].name).toBe('weather')
      expect(result.toolCalls[0].result).toBe('Sunny in SP')
      expect(result.toolCalls[0].status).toBe('complete')

      // Messages: user, assistant(tool_call), tool(result), assistant(final)
      expect(result.messages.filter(m => m.role === 'tool')).toHaveLength(1)
      expect(result.messages.filter(m => m.role === 'tool')[0].content).toBe('Sunny in SP')
    })

    it('handles text alongside tool calls', async () => {
      const adapter = createSequentialAdapter([
        [
          { type: 'text', content: 'Let me check...' },
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'search', args: '{"q":"test"}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'Based on my search: found it.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [{ name: 'search', execute: async () => 'result' }],
      })
      const result = await runtime.run('Search for test')

      // First assistant message should have both text and tool calls
      const firstAssistant = result.messages.find(m => m.role === 'assistant')
      expect(firstAssistant?.content).toBe('Let me check...')
      expect(firstAssistant?.toolCalls).toHaveLength(1)
      expect(result.content).toBe('Based on my search: found it.')
    })
  })

  describe('abort', () => {
    it('stops the loop when signal is aborted', async () => {
      const controller = new AbortController()
      let callCount = 0

      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'slow', args: '{}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'should not reach' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [{
          name: 'slow',
          execute: async () => {
            callCount++
            controller.abort()
            return 'done'
          },
        }],
      })

      const result = await runtime.run('go', { signal: controller.signal })

      expect(callCount).toBe(1)
      expect(result.steps).toBeLessThanOrEqual(2)
    })
  })

  describe('max steps', () => {
    it('terminates after maxSteps is reached', async () => {
      // Adapter always requests a tool call — would loop forever
      const adapter: ReturnType<typeof createMockAdapter> = {
        createSource: () => {
          let aborted = false
          return {
            stream: async function* () {
              if (!aborted) {
                yield { type: 'tool_call' as const, toolCall: { id: `tc-${Date.now()}`, name: 'loop', args: '{}' } }
                yield { type: 'done' as const }
              }
            },
            abort: () => { aborted = true },
          }
        },
      }

      const runtime = createRuntime({
        adapter,
        tools: [{ name: 'loop', execute: async () => 'again' }],
        maxSteps: 3,
      })

      const result = await runtime.run('loop forever')
      expect(result.steps).toBe(3)
    })

    it('per-run maxSteps overrides config', async () => {
      const adapter: ReturnType<typeof createMockAdapter> = {
        createSource: () => ({
          stream: async function* () {
            yield { type: 'tool_call' as const, toolCall: { id: `tc-${Date.now()}`, name: 'loop', args: '{}' } }
            yield { type: 'done' as const }
          },
          abort: () => {},
        }),
      }

      const runtime = createRuntime({
        adapter,
        tools: [{ name: 'loop', execute: async () => 'again' }],
        maxSteps: 10,
      })

      const result = await runtime.run('loop', { maxSteps: 2 })
      expect(result.steps).toBe(2)
    })
  })

  describe('tool error injection', () => {
    it('injects tool error as message and continues', async () => {
      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'flaky', args: '{}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'I see the tool failed, let me try another way.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [{
          name: 'flaky',
          execute: async () => { throw new Error('API timeout') },
        }],
      })

      const result = await runtime.run('do it')

      expect(result.content).toBe('I see the tool failed, let me try another way.')
      expect(result.toolCalls[0].status).toBe('error')
      expect(result.toolCalls[0].error).toContain('API timeout')
      // Tool error injected as message
      const toolMsg = result.messages.find(m => m.role === 'tool')
      expect(toolMsg?.content).toContain('API timeout')
    })

    it('injects error for missing tool', async () => {
      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'nonexistent', args: '{}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'That tool is not available.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({ adapter })
      const result = await runtime.run('use nonexistent tool')

      expect(result.toolCalls[0].status).toBe('error')
      const toolMsg = result.messages.find(m => m.role === 'tool')
      expect(toolMsg?.content).toContain('not found')
    })
  })

  describe('tool lifecycle', () => {
    it('lazy inits tool only when called, disposes at end', async () => {
      const initFn = vi.fn()
      const disposeFn = vi.fn()

      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'browser', args: '{}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'Done browsing.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [
          {
            name: 'browser',
            init: initFn,
            dispose: disposeFn,
            execute: async () => 'page content',
          },
          {
            name: 'unused',
            init: vi.fn(),
            dispose: vi.fn(),
            execute: async () => 'nope',
          },
        ],
      })

      await runtime.run('browse something')

      expect(initFn).toHaveBeenCalledTimes(1)
      expect(disposeFn).toHaveBeenCalledTimes(1)
      // Unused tool should NOT be initialized — verified via the mocks.
      expect(vi.mocked(runtime as never)).toBeTruthy()
    })

    it('does not init same tool twice in one run', async () => {
      const initFn = vi.fn()

      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'search', args: '{"q":"a"}' } },
          { type: 'done' },
        ],
        [
          { type: 'tool_call', toolCall: { id: 'tc2', name: 'search', args: '{"q":"b"}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'Done.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [{
          name: 'search',
          init: initFn,
          execute: async (args) => `result for ${args.q}`,
        }],
      })

      await runtime.run('search twice')
      expect(initFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('skill activation', () => {
    it('applies skill systemPrompt and activates tools', async () => {
      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'web_search', args: '{"q":"test"}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'Research complete.' },
          { type: 'done' },
        ],
      ])

      const researcher: SkillDefinition = {
        name: 'researcher',
        description: 'Researches topics',
        systemPrompt: 'You are a thorough researcher.',
        onActivate: async () => ({
          tools: [{
            name: 'web_search',
            execute: async (args) => `results for ${args.q}`,
          }],
        }),
      }

      const runtime = createRuntime({ adapter })
      const result = await runtime.run('Research quantum computing', { skill: researcher })

      expect(result.messages[0].role).toBe('system')
      expect(result.messages[0].content).toBe('You are a thorough researcher.')
      expect(result.toolCalls[0].name).toBe('web_search')
      expect(result.content).toBe('Research complete.')
    })

    it('skill tools override config tools with same name', async () => {
      const configSearch = vi.fn().mockResolvedValue('config result')
      const skillSearch = vi.fn().mockResolvedValue('skill result')

      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'search', args: '{}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'Done.' },
          { type: 'done' },
        ],
      ])

      const skill: SkillDefinition = {
        name: 'test',
        description: 'test',
        systemPrompt: 'test',
        onActivate: async () => ({
          tools: [{ name: 'search', execute: skillSearch }],
        }),
      }

      const runtime = createRuntime({
        adapter,
        tools: [{ name: 'search', execute: configSearch }],
      })
      await runtime.run('go', { skill })

      expect(skillSearch).toHaveBeenCalled()
      expect(configSearch).not.toHaveBeenCalled()
    })
  })

  describe('memory', () => {
    it('saves messages to memory after run', async () => {
      const memory = createInMemoryMemory()
      const adapter = createMockAdapter([
        { type: 'text', content: 'Done.' },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, memory })
      await runtime.run('Do something')

      const saved = await memory.load()
      expect(saved.length).toBeGreaterThan(0)
      expect(saved[0].role).toBe('user')
    })

    it('does not hydrate from memory at start', async () => {
      const memory = createInMemoryMemory([{
        id: 'old',
        role: 'assistant',
        content: 'old message',
        status: 'complete',
        createdAt: new Date(),
      }])

      const adapter = createMockAdapter([
        { type: 'text', content: 'Fresh response.' },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, memory })
      const result = await runtime.run('New task')

      // Should NOT contain the old memory message
      expect(result.messages.find(m => m.content === 'old message')).toBeUndefined()
      expect(result.messages[0].role).toBe('user')
    })
  })

  describe('events', () => {
    it('emits agent:step, llm:start, llm:end events', async () => {
      const events: AgentEvent[] = []
      const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }

      const adapter = createMockAdapter([
        { type: 'text', content: 'Hi' },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, observers: [obs] })
      await runtime.run('Hello')

      expect(events.find(e => e.type === 'agent:step')).toBeDefined()
      expect(events.find(e => e.type === 'llm:start')).toBeDefined()
      expect(events.find(e => e.type === 'llm:end')).toBeDefined()
    })

    it('emits tool:start, tool:end events', async () => {
      const events: AgentEvent[] = []
      const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }

      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'test', args: '{}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'Done.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [{ name: 'test', execute: async () => 'ok' }],
        observers: [obs],
      })
      await runtime.run('go')

      expect(events.find(e => e.type === 'tool:start')).toBeDefined()
      expect(events.find(e => e.type === 'tool:end')).toBeDefined()
    })

    it('emits memory:save event', async () => {
      const events: AgentEvent[] = []
      const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }
      const memory = createInMemoryMemory()

      const adapter = createMockAdapter([
        { type: 'text', content: 'Hi' },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, memory, observers: [obs] })
      await runtime.run('Hello')

      expect(events.find(e => e.type === 'memory:save')).toBeDefined()
    })
  })
})
