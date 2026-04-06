/**
 * Cross-package integration tests — verifies that AgentsKit packages
 * work together correctly in real-world scenarios.
 */
import { describe, it, expect, vi } from 'vitest'

// Core
import {
  createChatController,
  createInMemoryMemory,
  buildMessage,
  createEventEmitter,
  loadConfig,
  type AgentEvent,
  type Observer,
  type AdapterFactory,
  type AdapterRequest,
  type StreamChunk,
  type ToolDefinition,
  type SkillDefinition,
  type ChatMemory,
  type VectorMemory,
  type EvalSuite,
} from '@agentskit/core'

// Runtime
import { createRuntime, createSharedContext } from '@agentskit/runtime'
import type { RunResult, DelegateConfig } from '@agentskit/runtime'

// Tools
import { webSearch, filesystem, shell, listTools } from '@agentskit/tools'

// Skills
import { researcher, coder, planner, critic, summarizer, composeSkills, listSkills } from '@agentskit/skills'

// Eval
import { runEval } from '@agentskit/eval'

// Observability
import { consoleLogger, createTraceTracker } from '@agentskit/observability'

// Templates
import { createToolTemplate, createSkillTemplate, createAdapterTemplate } from '@agentskit/templates'

// Test helpers
function createMockAdapter(chunks: StreamChunk[]): AdapterFactory {
  return {
    createSource: (_request: AdapterRequest) => {
      let aborted = false
      return {
        stream: async function* () {
          for (const chunk of chunks) {
            if (aborted) return
            yield chunk
          }
        },
        abort: () => { aborted = true },
      }
    },
  }
}

function createSequentialAdapter(calls: StreamChunk[][]): AdapterFactory {
  let callIndex = 0
  return {
    createSource: () => {
      const chunks = calls[callIndex] ?? [{ type: 'text' as const, content: 'done' }, { type: 'done' as const }]
      callIndex++
      let aborted = false
      return {
        stream: async function* () {
          for (const chunk of chunks) {
            if (aborted) return
            yield chunk
          }
        },
        abort: () => { aborted = true },
      }
    },
  }
}

describe('Cross-package interop', () => {
  describe('runtime + tools + skills', () => {
    it('agent uses tools and skills together', async () => {
      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'shell', args: '{"command":"echo hello"}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'The command output: hello' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [shell({ timeout: 5000, allowed: ['echo'] })],
      })

      const result = await runtime.run('Run echo hello', { skill: coder })
      expect(result.steps).toBeGreaterThanOrEqual(1)
      expect(result.toolCalls.length).toBeGreaterThanOrEqual(0)
      expect(result.messages.length).toBeGreaterThan(0)
    })
  })

  describe('runtime + tools + memory', () => {
    it('agent saves messages to memory after run', async () => {
      const memory = createInMemoryMemory()
      const adapter = createMockAdapter([
        { type: 'text', content: 'Saved to memory.' },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, memory })
      await runtime.run('Remember this')

      const saved = await memory.load()
      expect(saved.length).toBeGreaterThan(0)
      expect(saved.some(m => m.role === 'user')).toBe(true)
    })
  })

  describe('runtime + observability', () => {
    it('events flow to observers during agent run', async () => {
      const events: AgentEvent[] = []
      const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }

      const adapter = createMockAdapter([
        { type: 'text', content: 'observed' },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, observers: [obs] })
      await runtime.run('Hello')

      expect(events.some(e => e.type === 'agent:step')).toBe(true)
      expect(events.some(e => e.type === 'llm:start')).toBe(true)
      expect(events.some(e => e.type === 'llm:end')).toBe(true)
    })
  })

  describe('runtime + delegation + skills', () => {
    it('parent delegates to child agents', async () => {
      const adapter = createSequentialAdapter([
        // Parent calls delegate_researcher
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"find info"}' } },
          { type: 'done' },
        ],
        // Child researcher responds
        [
          { type: 'text', content: 'Found research results' },
          { type: 'done' },
        ],
        // Parent produces final answer
        [
          { type: 'text', content: 'Based on research: here is the answer' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        delegates: {
          researcher: { skill: researcher, maxSteps: 2 },
        },
      })

      const result = await runtime.run('Research and summarize', { skill: planner })
      expect(result.content).toBeTruthy()
      expect(result.steps).toBeGreaterThanOrEqual(1)
    })
  })

  describe('controller + tools + skills', () => {
    it('chat controller activates skills and executes tools', async () => {
      const execute = vi.fn().mockResolvedValue('tool result')
      const adapter = createMockAdapter([
        { type: 'tool_call', toolCall: { id: 'tc1', name: 'custom', args: '{}' } },
        { type: 'done' },
      ])

      const skill: SkillDefinition = {
        name: 'test-skill',
        description: 'Test',
        systemPrompt: 'You are helpful.',
        onActivate: async () => ({
          tools: [{ name: 'custom', execute, description: 'test', schema: { type: 'object' } }],
        }),
      }

      const ctrl = createChatController({ adapter, skills: [skill] })
      await new Promise(r => setTimeout(r, 20))
      await ctrl.send('Use the tool')

      expect(execute).toHaveBeenCalled()
    })
  })

  describe('eval + runtime', () => {
    it('eval runs agent against test cases', async () => {
      const result = await runEval({
        agent: async (input) => `Answer to: ${input}`,
        suite: {
          name: 'basic',
          cases: [
            { input: 'What is 2+2?', expected: 'Answer' },
            { input: 'Hello', expected: 'nope' },
          ],
        },
      })

      expect(result.totalCases).toBe(2)
      expect(result.passed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.accuracy).toBeCloseTo(0.5)
    })
  })

  describe('templates + core contracts', () => {
    it('createToolTemplate produces valid ToolDefinition', () => {
      const tool = createToolTemplate({
        name: 'test-tool',
        description: 'A test tool',
        schema: { type: 'object', properties: { input: { type: 'string' } } },
        execute: async () => 'ok',
      })

      expect(tool.name).toBe('test-tool')
      expect(tool.execute).toBeTypeOf('function')
    })

    it('createSkillTemplate with base inherits correctly', () => {
      const custom = createSkillTemplate({
        base: researcher,
        name: 'my-researcher',
        temperature: 0.2,
      })

      expect(custom.name).toBe('my-researcher')
      expect(custom.systemPrompt).toBe(researcher.systemPrompt)
      expect(custom.temperature).toBe(0.2)
    })
  })

  describe('skills composition', () => {
    it('composeSkills merges prompts and tools', () => {
      const composed = composeSkills(researcher, coder)
      expect(composed.name).toBe('researcher+coder')
      expect(composed.systemPrompt).toContain('researcher')
      expect(composed.systemPrompt).toContain('coder')
      expect(composed.tools).toContain('web_search')
      expect(composed.tools).toContain('read_file')
    })
  })

  describe('discovery functions', () => {
    it('listTools returns all built-in tools', () => {
      const tools = listTools()
      expect(tools.length).toBe(5)
      expect(tools.map(t => t.name)).toContain('web_search')
    })

    it('listSkills returns all built-in skills', () => {
      const skills = listSkills()
      expect(skills.length).toBe(5)
      expect(skills.map(s => s.name)).toContain('researcher')
    })
  })

  describe('shared context isolation', () => {
    it('readOnly view prevents writes', () => {
      const ctx = createSharedContext({ key: 'value' })
      const ro = ctx.readOnly()
      expect(ro.get('key')).toBe('value')
      expect((ro as Record<string, unknown>).set).toBeUndefined()
    })
  })

  describe('event emitter isolation', () => {
    it('error in one observer does not break others', () => {
      const emitter = createEventEmitter()
      const goodHandler = vi.fn()
      emitter.addObserver({ name: 'bad', on: () => { throw new Error('boom') } })
      emitter.addObserver({ name: 'good', on: goodHandler })

      emitter.emit({ type: 'llm:start', messageCount: 1 })
      expect(goodHandler).toHaveBeenCalled()
    })
  })
})

describe('Ecosystem health checks', () => {
  it('all 5 built-in skills have required fields', () => {
    for (const skill of [researcher, coder, planner, critic, summarizer]) {
      expect(skill.name).toBeTruthy()
      expect(skill.description).toBeTruthy()
      expect(skill.systemPrompt.length).toBeGreaterThan(50)
    }
  })

  it('all 5 built-in tools have schemas', () => {
    const allTools = [
      webSearch(),
      ...filesystem({ basePath: '/tmp' }),
      shell(),
    ]
    for (const tool of allTools) {
      expect(tool.name).toBeTruthy()
      expect(tool.schema).toBeDefined()
      expect(tool.execute).toBeTypeOf('function')
    }
  })

  it('consoleLogger satisfies Observer contract', () => {
    const logger = consoleLogger({ format: 'json' })
    expect(logger.name).toBeTruthy()
    expect(logger.on).toBeTypeOf('function')
  })

  it('traceTracker handles full event lifecycle', () => {
    const started: unknown[] = []
    const ended: unknown[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: (s) => ended.push(s),
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'llm:start', messageCount: 1 })
    tracker.handle({ type: 'llm:end', content: 'hi', durationMs: 100 })
    tracker.flush()

    expect(started.length).toBeGreaterThanOrEqual(2)
    expect(ended.length).toBeGreaterThanOrEqual(2)
  })
})
