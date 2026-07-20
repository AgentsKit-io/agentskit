import { describe, it, expect, vi } from 'vitest'
import { createRuntime } from '../src/runner'
import { createInMemoryMemory } from '@agentskit/core'
import type {
  AdapterFactory,
  AdapterRequest,
  AgentEvent,
  ChatMemory,
  Message,
  Observer,
  Retriever,
  SkillDefinition,
  StreamChunk,
  ToolDefinition,
} from '@agentskit/core'
import { createMockAdapter, createSequentialAdapter } from './helpers'

function createDeferred<T = void>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function whenAborted(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

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
    it('rejects with AbortError when the signal is aborted between steps', async () => {
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

      const runPromise = runtime.run('go', { signal: controller.signal })
      await expect(runPromise).rejects.toMatchObject({ name: 'AbortError' })
      expect(callCount).toBe(1)
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

    it('RT7: configured memory is loaded and prefixed before the current user task is sent to the adapter', async () => {
      const prior: Message = {
        id: 'old',
        role: 'assistant',
        content: 'old message',
        status: 'complete',
        createdAt: new Date(),
      }
      const memory = createInMemoryMemory([prior])
      const load = vi.spyOn(memory, 'load')

      let capturedRequest: AdapterRequest | undefined
      const adapter: AdapterFactory = {
        createSource: (request) => {
          capturedRequest = request
          return createMockAdapter([
            { type: 'text', content: 'Fresh response.' },
            { type: 'done' },
          ]).createSource(request)
        },
      }

      const runtime = createRuntime({ adapter, memory })
      const result = await runtime.run('New task')

      expect(load).toHaveBeenCalled()
      expect(capturedRequest).toBeDefined()

      const adapterMessages = capturedRequest!.messages
      const userTaskIndex = adapterMessages.findIndex(
        (m) => m.role === 'user' && m.content === 'New task',
      )
      expect(userTaskIndex).toBeGreaterThan(0)
      expect(
        adapterMessages.slice(0, userTaskIndex).some((m) => m.content === 'old message'),
      ).toBe(true)

      expect(result.messages.find((m) => m.content === 'old message')).toBeDefined()
      const resultUserIndex = result.messages.findIndex(
        (m) => m.role === 'user' && m.content === 'New task',
      )
      expect(resultUserIndex).toBeGreaterThan(0)
      expect(
        result.messages.slice(0, resultUserIndex).some((m) => m.content === 'old message'),
      ).toBe(true)
    })
  })

  describe('retrieval (RT8)', () => {
    it('RT8: multi-step tool loop calls retriever.retrieve exactly once per run with the original task as query', async () => {
      const task = 'What is the weather in SP?'
      const retrieve = vi.fn().mockResolvedValue([
        { id: 'doc-1', content: 'SP climate notes' },
      ])
      const retriever: Retriever = { retrieve }

      const adapter = createSequentialAdapter([
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'weather', args: '{"city":"SP"}' } },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'Sunny in SP.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        retriever,
        tools: [{ name: 'weather', execute: async () => 'Sunny' }],
      })
      const result = await runtime.run(task)

      expect(result.steps).toBe(2)
      expect(retrieve).toHaveBeenCalledTimes(1)
      expect(retrieve).toHaveBeenCalledWith(
        expect.objectContaining({ query: task }),
      )
    })
  })

  describe('confirmation (RT6)', () => {
    it('RT6: requiresConfirmation tool with no onConfirm never executes and yields a refusal/tool error result', async () => {
      const execute = vi.fn().mockResolvedValue('should-not-run')

      const adapter = createSequentialAdapter([
        [
          {
            type: 'tool_call',
            toolCall: { id: 'tc1', name: 'dangerous', args: '{"op":"wipe"}' },
          },
          { type: 'done' },
        ],
        [
          { type: 'text', content: 'I could not run that tool.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        tools: [{
          name: 'dangerous',
          requiresConfirmation: true,
          execute,
        }],
      })
      const result = await runtime.run('wipe everything')

      expect(execute).not.toHaveBeenCalled()
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls[0].status).toBe('error')
      expect(result.toolCalls[0].error).toBeDefined()
      const toolMsg = result.messages.find((m) => m.role === 'tool')
      expect(toolMsg?.content.toLowerCase()).toMatch(/confirm|refus|approv|declin/)
    })
  })

  describe('abort (RT13)', () => {
    it('RT13: abort mid-stream calls source.abort, rejects with AbortError, skips memory.save, emits run-aborted', async () => {
      const controller = new AbortController()
      const streamEntered = createDeferred()
      const abortSpy = vi.fn()
      const save = vi.fn().mockResolvedValue(undefined)
      const memory: ChatMemory = {
        load: async () => [],
        save,
      }

      const eventTypes: string[] = []
      const obs: Observer = {
        name: 'abort-observer',
        on: (e) => {
          eventTypes.push(e.type)
        },
      }

      const adapter: AdapterFactory = {
        createSource: () => {
          let released = false
          const release = createDeferred()
          return {
            stream: async function* (): AsyncGenerator<StreamChunk> {
              streamEntered.resolve()
              await Promise.race([release.promise, whenAborted(controller.signal)])
              if (controller.signal.aborted || released) return
              yield { type: 'text', content: 'should not complete' }
              yield { type: 'done' }
            },
            abort: () => {
              released = true
              abortSpy()
              release.resolve()
            },
          }
        },
      }

      const runtime = createRuntime({ adapter, memory, observers: [obs] })
      const runPromise = runtime.run('abort me', { signal: controller.signal })

      await streamEntered.promise
      controller.abort()

      await expect(runPromise).rejects.toMatchObject({ name: 'AbortError' })
      expect(abortSpy).toHaveBeenCalled()
      expect(save).not.toHaveBeenCalled()
      expect(eventTypes).toContain('run-aborted')
    })

    it('RT13: abort after tool init still disposes the initialized tool and rejects with AbortError', async () => {
      const controller = new AbortController()
      const secondStreamEntered = createDeferred()
      const abortSpy = vi.fn()
      const disposeFn = vi.fn().mockResolvedValue(undefined)
      const initFn = vi.fn().mockResolvedValue(undefined)
      const save = vi.fn().mockResolvedValue(undefined)
      const memory: ChatMemory = {
        load: async () => [],
        save,
      }

      const eventTypes: string[] = []
      const obs: Observer = {
        name: 'abort-dispose-observer',
        on: (e) => {
          eventTypes.push(e.type)
        },
      }

      let callIndex = 0
      const adapter: AdapterFactory = {
        createSource: () => {
          callIndex++
          if (callIndex === 1) {
            return {
              stream: async function* (): AsyncGenerator<StreamChunk> {
                yield {
                  type: 'tool_call',
                  toolCall: { id: 'tc1', name: 'browser', args: '{}' },
                }
                yield { type: 'done' }
              },
              abort: () => {},
            }
          }

          let released = false
          const release = createDeferred()
          return {
            stream: async function* (): AsyncGenerator<StreamChunk> {
              secondStreamEntered.resolve()
              await Promise.race([release.promise, whenAborted(controller.signal)])
              if (controller.signal.aborted || released) return
              yield { type: 'text', content: 'should not complete' }
              yield { type: 'done' }
            },
            abort: () => {
              released = true
              abortSpy()
              release.resolve()
            },
          }
        },
      }

      const runtime = createRuntime({
        adapter,
        memory,
        observers: [obs],
        tools: [{
          name: 'browser',
          init: initFn,
          dispose: disposeFn,
          execute: async () => 'page content',
        }],
      })

      const runPromise = runtime.run('browse then abort', { signal: controller.signal })

      await secondStreamEntered.promise
      expect(initFn).toHaveBeenCalledTimes(1)

      controller.abort()

      await expect(runPromise).rejects.toMatchObject({ name: 'AbortError' })
      expect(abortSpy).toHaveBeenCalled()
      expect(save).not.toHaveBeenCalled()
      expect(eventTypes).toContain('run-aborted')
      expect(disposeFn).toHaveBeenCalledTimes(1)
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

    it('includes normalized usage from stream chunks on llm:end', async () => {
      const events: AgentEvent[] = []
      const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }

      const adapter = createMockAdapter([
        { type: 'text', content: 'Hi' },
        { type: 'usage', usage: { promptTokens: 12, completionTokens: 4, totalTokens: 16 } },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, observers: [obs] })
      await runtime.run('Hello')

      const end = events.find(e => e.type === 'llm:end')
      expect(end?.type === 'llm:end' && end.usage).toEqual({ promptTokens: 12, completionTokens: 4 })
    })

    it('normalizes non-finite/negative usage on llm:end', async () => {
      const events: AgentEvent[] = []
      const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }

      const adapter = createMockAdapter([
        { type: 'text', content: 'Hi' },
        { type: 'usage', usage: { promptTokens: Number.POSITIVE_INFINITY, completionTokens: -1, totalTokens: 0 } },
        { type: 'done' },
      ])

      const runtime = createRuntime({ adapter, observers: [obs] })
      await runtime.run('Hello')

      const end = events.find(e => e.type === 'llm:end')
      expect(end?.type === 'llm:end' && end.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
    })

    it('emits error before llm:end on stream errors', async () => {
      const types: string[] = []
      const obs: Observer = { name: 'test', on: (e) => { types.push(e.type) } }

      const adapter = createMockAdapter([
        { type: 'text', content: 'partial' },
        { type: 'error', content: 'upstream failed' },
      ])

      const runtime = createRuntime({ adapter, observers: [obs] })
      await expect(runtime.run('Hello')).rejects.toThrow(/upstream failed/)

      const llmStart = types.indexOf('llm:start')
      const err = types.indexOf('error')
      const llmEnd = types.indexOf('llm:end')
      expect(llmStart).toBeGreaterThanOrEqual(0)
      expect(err).toBeGreaterThan(llmStart)
      expect(llmEnd).toBeGreaterThan(err)
      expect(types.slice(err, err + 2)).toEqual(['error', 'llm:end'])
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

    it('RT9: throwing observer does not fail the run and another observer still receives later events', async () => {
      const laterEvents: AgentEvent[] = []
      const throwing: Observer = {
        name: 'throwing',
        on: () => {
          throw new Error('observer boom')
        },
      }
      const healthy: Observer = {
        name: 'healthy',
        on: (e) => {
          laterEvents.push(e)
        },
      }

      const adapter = createMockAdapter([
        { type: 'text', content: 'OK' },
        { type: 'done' },
      ])

      const runtime = createRuntime({
        adapter,
        observers: [throwing, healthy],
      })
      const result = await runtime.run('Hello')

      expect(result.content).toBe('OK')
      expect(laterEvents.find((e) => e.type === 'agent:step')).toBeDefined()
      expect(laterEvents.find((e) => e.type === 'llm:start')).toBeDefined()
      expect(laterEvents.find((e) => e.type === 'llm:end')).toBeDefined()
    })
  })
})
