import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInMemoryMemory } from '@agentskit/core'
import type { AdapterFactory, AgentEvent, ChatMemory, StreamChunk, ToolDefinition } from '@agentskit/core'
import type { RuntimeConfig, RunOptions, RunResult } from '../src/types'

/**
 * Runtime contract harness from ADR 0006. Each invariant is a test named by
 * its id (RT1–RT14). `build` receives a mock-adapter-backed config so any
 * runtime exposing `run(task, options?)` can be checked.
 */
export interface RuntimeUnderTest {
  run(task: string, options?: RunOptions): Promise<RunResult>
}

export type RuntimeFactory = (config: RuntimeConfig) => RuntimeUnderTest

type StreamFixture = Array<{ name: string; value: StreamChunk[] }>

/** Stream chunk fixtures from `tests/interop/fixtures/stream.json`. */
export function loadStreamFixtures(): Record<string, StreamChunk[]> {
  const path = resolve(__dirname, '../../../tests/interop/fixtures/stream.json')
  const file = JSON.parse(readFileSync(path, 'utf8')) as { valid: StreamFixture }
  return Object.fromEntries(file.valid.map(v => [v.name, v.value]))
}

type ErrorFixture = Array<{ name: string; value: { name: string; code: string; message: string } }>

/** Error shape fixtures from `tests/interop/fixtures/errors.json` (name, code, message). */
export function loadErrorFixtures(): Record<string, { name: string; code: string; message: string }> {
  const path = resolve(__dirname, '../../../tests/interop/fixtures/errors.json')
  const file = JSON.parse(readFileSync(path, 'utf8')) as { valid: ErrorFixture }
  return Object.fromEntries(file.valid.map(v => [v.name, v.value]))
}

/** Adapter replaying one chunk list per model call; after the list ends it answers 'done'. */
export function scriptedAdapter(calls: StreamChunk[][], seen?: { calls: number }): AdapterFactory {
  let index = 0
  return {
    createSource: () => {
      const chunks = calls[index] ?? [{ type: 'text', content: 'done' }, { type: 'done' }]
      index++
      if (seen) seen.calls = index
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

const TOOL_CALL = (id: string, name: string, args = '{}'): StreamChunk[] => [
  { type: 'tool_call', toolCall: { id, name, args } },
  { type: 'done' },
]
const TEXT_DONE = (content: string): StreamChunk[] => [{ type: 'text', content }, { type: 'done' }]

function collect(): { events: AgentEvent[]; observer: { name: string; on: (e: AgentEvent) => void } } {
  const events: AgentEvent[] = []
  return { events, observer: { name: 'contract', on: e => { events.push(e) } } }
}

function countingMemory(): { memory: ChatMemory; saves: () => number } {
  const inner = createInMemoryMemory()
  let saves = 0
  return {
    memory: { ...inner, save: async (m, o) => { saves++; return inner.save(m, o) } },
    saves: () => saves,
  }
}

export function runRuntimeContract(label: string, create: RuntimeFactory): void {
  const fixtures = loadStreamFixtures()
  const errors = loadErrorFixtures()

  describe(`Runtime contract (ADR 0006): ${label}`, () => {
    it('RT1 construction performs no adapter call', () => {
      const seen = { calls: 0 }
      create({ adapter: scriptedAdapter([TEXT_DONE('x')], seen) })
      expect(seen.calls).toBe(0)
    })

    it('RT2 run is the entry point and resolves with a RunResult', async () => {
      const rt = create({ adapter: scriptedAdapter([TEXT_DONE('hi')]) })
      expect(typeof rt.run).toBe('function')
      await expect(rt.run('hello')).resolves.toMatchObject({ content: 'hi' })
    })

    it('RT3 run options override config (maxSteps)', async () => {
      const tool: ToolDefinition = { name: 'noop', execute: () => 'ok' }
      const seen = { calls: 0 }
      const rt = create({
        adapter: scriptedAdapter([TOOL_CALL('a', 'noop'), TOOL_CALL('b', 'noop'), TOOL_CALL('c', 'noop')], seen),
        tools: [tool],
        maxSteps: 10,
      })
      const res = await rt.run('go', { maxSteps: 2 })
      expect(res.steps).toBe(2)
    })

    it('RT4 natural completion ends the loop; maxSteps is a hard cap', async () => {
      const natural = await create({ adapter: scriptedAdapter([TEXT_DONE('fin')]) }).run('go')
      expect(natural.steps).toBe(1)
      const endless = Array.from({ length: 20 }, (_, i) => TOOL_CALL(`c${i}`, 'noop'))
      const capped = await create({
        adapter: scriptedAdapter(endless),
        tools: [{ name: 'noop', execute: () => 'ok' }],
        maxSteps: 3,
      }).run('go')
      expect(capped.steps).toBe(3)
    })

    it('RT5 run tools shadow config tools; an unknown tool is a tool error, not a throw', async () => {
      const rt = create({
        adapter: scriptedAdapter([TOOL_CALL('a', 'pick'), TOOL_CALL('b', 'missing'), TEXT_DONE('end')]),
        tools: [{ name: 'pick', execute: () => 'from-config' }],
      })
      const res = await rt.run('go', { tools: [{ name: 'pick', execute: () => 'from-options' }] })
      expect(res.toolCalls[0]?.result).toBe('from-options')
      expect(res.toolCalls[1]?.status).toBe('error')
      expect(res.content).toBe('end')
    })

    it('RT6 confirmation: no approver refuses, a declining approver refuses, approval executes', async () => {
      let executed = 0
      const gated: ToolDefinition = { name: 'gated', requiresConfirmation: true, execute: () => { executed++; return 'ran' } }
      const script = () => [TOOL_CALL('a', 'gated'), TEXT_DONE('end')]
      const none = await create({ adapter: scriptedAdapter(script()), tools: [gated] }).run('go')
      expect(none.toolCalls[0]?.status).toBe('error')
      const declined = await create({ adapter: scriptedAdapter(script()), tools: [gated], onConfirm: () => false }).run('go')
      expect(declined.toolCalls[0]?.status).toBe('error')
      expect(executed).toBe(0)
      const approved = await create({ adapter: scriptedAdapter(script()), tools: [gated], onConfirm: () => true }).run('go')
      expect(approved.toolCalls[0]?.status).toBe('complete')
      expect(executed).toBe(1)
    })

    it('RT7 memory is loaded before the run and saved after success only', async () => {
      const { memory, saves } = countingMemory()
      await memory.save([{ id: 'p', role: 'user', content: 'earlier', status: 'complete', createdAt: new Date(0) }])
      const before = saves()
      const res = await create({ adapter: scriptedAdapter([TEXT_DONE('ok')]), memory }).run('now')
      expect(res.messages.some(m => m.content === 'earlier')).toBe(true)
      expect(saves()).toBe(before + 1)
    })

    it('RT8 retrieval happens once per run, not once per step', async () => {
      let retrievals = 0
      const rt = create({
        adapter: scriptedAdapter([TOOL_CALL('a', 'noop'), TEXT_DONE('end')]),
        tools: [{ name: 'noop', execute: () => 'ok' }],
        retriever: { retrieve: async () => { retrievals++; return [] } },
      })
      const res = await rt.run('query')
      expect(res.steps).toBe(2)
      expect(retrievals).toBe(1)
    })

    it('RT9 observers see run events; an observer failure does not break the run', async () => {
      const { events, observer } = collect()
      const failing = { name: 'boom', on: () => { throw new Error('observer failure') } }
      const res = await create({
        adapter: scriptedAdapter([TOOL_CALL('a', 'noop'), TEXT_DONE('end')]),
        tools: [{ name: 'noop', execute: () => 'ok' }],
        observers: [failing, observer],
      }).run('go')
      expect(res.content).toBe('end')
      const types = new Set(events.map(e => e.type))
      for (const t of ['llm:start', 'llm:end', 'tool:start', 'tool:end'] as const) expect(types.has(t)).toBe(true)
    })

    it('RT10 delegation is a tool: delegate_<name> runs as a tool call whose execute is a nested run', async () => {
      const { events, observer } = collect()
      const child = { calls: 0 }
      const delegates = {
        helper: {
          skill: { name: 'helper', description: 'd', systemPrompt: 'p' },
          adapter: scriptedAdapter([TEXT_DONE('child answer')], child),
        },
      }
      const res = await create({
        adapter: scriptedAdapter([TOOL_CALL('d1', 'delegate_helper', '{"task":"subtask"}'), TEXT_DONE('end')]),
        delegates,
        observers: [observer],
      }).run('go')
      expect(res.toolCalls[0]).toMatchObject({ name: 'delegate_helper', status: 'complete', result: 'child answer' })
      expect(child.calls).toBe(1)
      expect(events.some(e => e.type === 'agent:delegate:start')).toBe(true)
      expect(events.some(e => e.type === 'agent:delegate:end')).toBe(true)
      expect(res.content).toBe('end')
    })

    it('RT11 delegation depth is bounded: no delegate tool is offered at the limit', async () => {
      let offered: string[] = []
      const adapter: AdapterFactory = {
        createSource: request => {
          offered = (request.context?.tools ?? []).map(t => t.name)
          return { stream: async function* () { yield* TEXT_DONE('x') }, abort: () => {} }
        },
      }
      const delegates = { helper: { skill: { name: 'helper', description: 'd', systemPrompt: 'p' } } }
      await create({ adapter, delegates, maxDelegationDepth: 1 }).run('go')
      expect(offered).toContain('delegate_helper')
      await create({ adapter, delegates, maxDelegationDepth: 0 }).run('go')
      expect(offered).not.toContain('delegate_helper')
    })

    it('RT12 RunResult has the deterministic shape', async () => {
      const res = await create({
        adapter: scriptedAdapter([TOOL_CALL('a', 'noop'), TEXT_DONE('end')]),
        tools: [{ name: 'noop', execute: () => 'ok' }],
      }).run('go')
      expect(typeof res.content).toBe('string')
      expect(Array.isArray(res.messages)).toBe(true)
      expect(res.steps).toBe(2)
      expect(res.toolCalls).toHaveLength(1)
      expect(res.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('RT13 abort rejects with AbortError (fixture: abort), skips memory save and emits run-aborted', async () => {
      const { events, observer } = collect()
      const { memory, saves } = countingMemory()
      const controller = new AbortController()
      controller.abort()
      await expect(
        create({ adapter: scriptedAdapter([TEXT_DONE('x')]), memory, observers: [observer] }).run('go', { signal: controller.signal }),
      ).rejects.toMatchObject({ name: errors['abort']!.name, message: errors['abort']!.message })
      expect(saves()).toBe(0)
      expect(events.some(e => e.type === 'run-aborted')).toBe(true)
    })

    it('RT14 a tool error is categorized (fixture: tool-exec-failed), fed back, and the loop continues', async () => {
      const { events, observer } = collect()
      const res = await create({
        adapter: scriptedAdapter([TOOL_CALL('a', 'bad'), TEXT_DONE('recovered')]),
        tools: [{ name: 'bad', execute: () => { throw new Error('tool boom') } }],
        observers: [observer],
      }).run('go')
      const expected = errors['tool-exec-failed']!
      const surfaced = events.find(e => e.type === 'error')
      expect(surfaced?.type === 'error' ? surfaced.error : undefined).toMatchObject({ name: expected.name, code: expected.code })
      expect(res.toolCalls[0]?.error).toContain(expected.code)
      expect(res.toolCalls[0]?.status).toBe('error')
      expect(res.messages.some(m => m.role === 'tool' && m.content.includes('Error'))).toBe(true)
      expect(res.content).toBe('recovered')
    })

    it('RT14 an adapter error chunk terminates the run with a categorized error (fixtures: error-chunk, adapter-stream-failed)', async () => {
      const { events, observer } = collect()
      const expected = errors['adapter-stream-failed']!
      await expect(
        create({ adapter: scriptedAdapter([fixtures['error-chunk']!]), observers: [observer] }).run('go'),
      ).rejects.toMatchObject({ name: expected.name, code: expected.code })
      expect(events.some(e => e.type === 'error')).toBe(true)
    })

    it('stream fixture text-tool-done: a streamed tool call is executed and its result recorded', async () => {
      const res = await create({
        adapter: scriptedAdapter([fixtures['text-tool-done']!, TEXT_DONE('end')]),
        tools: [{ name: 'get_weather', execute: () => ({ tempC: 21 }) }],
      }).run('weather?')
      expect(res.toolCalls[0]).toMatchObject({ name: 'get_weather', status: 'complete' })
    })
  })
}
