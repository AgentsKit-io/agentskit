import { describe, it, expect, vi } from 'vitest'
import { generateId, createEventEmitter, buildMessage, executeToolCall, consumeStream, safeParseArgs } from '../src/primitives'
import type { Observer, AgentEvent, ToolDefinition, ToolCall, StreamSource, StreamChunk } from '../src/types'

describe('safeParseArgs', () => {
  it('accepts only JSON object roots', () => {
    expect(safeParseArgs('{"q":"hello"}')).toEqual({ q: 'hello' })
    expect(safeParseArgs('[1,2]')).toEqual({})
    expect(safeParseArgs('null')).toEqual({})
    expect(safeParseArgs('"text"')).toEqual({})
  })
})

describe('generateId', () => {
  it('generates unique IDs with the given prefix', () => {
    const id1 = generateId('msg')
    const id2 = generateId('msg')
    expect(id1).toMatch(/^msg-\d+-\d+$/)
    expect(id2).toMatch(/^msg-\d+-\d+$/)
    expect(id1).not.toBe(id2)
  })

  it('uses different prefixes', () => {
    const msgId = generateId('msg')
    const toolId = generateId('tool')
    const stepId = generateId('step')
    expect(msgId).toMatch(/^msg-/)
    expect(toolId).toMatch(/^tool-/)
    expect(stepId).toMatch(/^step-/)
  })
})

describe('createEventEmitter', () => {
  it('emits events to all observers', () => {
    const emitter = createEventEmitter()
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const obs1: Observer = { name: 'a', on: handler1 }
    const obs2: Observer = { name: 'b', on: handler2 }

    emitter.addObserver(obs1)
    emitter.addObserver(obs2)

    const event: AgentEvent = { type: 'llm:start', messageCount: 3 }
    emitter.emit(event)

    expect(handler1).toHaveBeenCalledWith(event)
    expect(handler2).toHaveBeenCalledWith(event)
  })

  it('removeObserver stops delivery', () => {
    const emitter = createEventEmitter()
    const handler = vi.fn()
    const obs: Observer = { name: 'test', on: handler }

    const remove = emitter.addObserver(obs)
    emitter.emit({ type: 'llm:start', messageCount: 1 })
    expect(handler).toHaveBeenCalledTimes(1)

    remove()
    emitter.emit({ type: 'llm:start', messageCount: 2 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('error in one observer does not break others', () => {
    const emitter = createEventEmitter()
    const badObs: Observer = { name: 'bad', on: () => { throw new Error('boom') } }
    const goodHandler = vi.fn()
    const goodObs: Observer = { name: 'good', on: goodHandler }

    emitter.addObserver(badObs)
    emitter.addObserver(goodObs)

    emitter.emit({ type: 'llm:start', messageCount: 1 })
    expect(goodHandler).toHaveBeenCalledTimes(1)
  })

  it('handles async observers without blocking', () => {
    const emitter = createEventEmitter()
    const asyncObs: Observer = {
      name: 'async',
      on: async () => { await new Promise(r => setTimeout(r, 10)) },
    }
    const syncHandler = vi.fn()
    const syncObs: Observer = { name: 'sync', on: syncHandler }

    emitter.addObserver(asyncObs)
    emitter.addObserver(syncObs)

    emitter.emit({ type: 'llm:start', messageCount: 1 })
    expect(syncHandler).toHaveBeenCalledTimes(1)
  })
})

describe('buildMessage', () => {
  it('creates a message with defaults', () => {
    const msg = buildMessage({ role: 'user', content: 'hello' })
    expect(msg.id).toMatch(/^msg-/)
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('hello')
    expect(msg.status).toBe('complete')
    expect(msg.createdAt).toBeInstanceOf(Date)
  })

  it('accepts status override', () => {
    const msg = buildMessage({ role: 'assistant', content: '', status: 'streaming' })
    expect(msg.status).toBe('streaming')
  })

  it('accepts metadata', () => {
    const msg = buildMessage({ role: 'system', content: 'sys', metadata: { key: 'val' } })
    expect(msg.metadata).toEqual({ key: 'val' })
  })
})

describe('executeToolCall', () => {
  const baseCall: ToolCall = {
    id: 'tc-1',
    name: 'test',
    args: { q: 'hello' },
    status: 'running',
  }

  it('executes a sync tool and returns string result', async () => {
    const tool: ToolDefinition = {
      name: 'test',
      execute: (args) => `result: ${args.q}`,
    }
    const result = await executeToolCall(tool, baseCall.args, {
      messages: [],
      call: baseCall,
    })
    expect(result).toBe('result: hello')
  })

  it('serializes structured tool results as JSON for the next model turn', async () => {
    const result = await executeToolCall(
      {
        name: 'search',
        execute: () => ({
          results: [{ title: 'AgentsKit', score: 0.98 }],
          cached: false,
        }),
      },
      {},
      {
        messages: [],
        call: { id: 'call-1', name: 'search', args: {}, status: 'running' },
      },
    )

    expect(result).toBe('{"results":[{"title":"AgentsKit","score":0.98}],"cached":false}')
  })

  it('executes an async tool', async () => {
    const tool: ToolDefinition = {
      name: 'test',
      execute: async (args) => `async: ${args.q}`,
    }
    const result = await executeToolCall(tool, baseCall.args, {
      messages: [],
      call: baseCall,
    })
    expect(result).toBe('async: hello')
  })

  it('handles AsyncIterable tools with onPartialResult', async () => {
    const partials: string[] = []
    const tool: ToolDefinition = {
      name: 'stream',
      async *execute() {
        yield 'line1\n'
        yield 'line2\n'
        yield 'line3'
      },
    }
    const result = await executeToolCall(
      tool,
      {},
      { messages: [], call: baseCall },
      (partial) => { partials.push(partial) },
    )
    expect(partials).toEqual(['line1\n', 'line1\nline2\n', 'line1\nline2\nline3'])
    expect(result).toBe('line1\nline2\nline3')
  })

  it('handles AsyncIterable tools without onPartialResult', async () => {
    const tool: ToolDefinition = {
      name: 'stream',
      async *execute() {
        yield 'a'
        yield 'b'
      },
    }
    const result = await executeToolCall(
      tool,
      {},
      { messages: [], call: baseCall },
    )
    expect(result).toBe('ab')
  })

  it('returns empty string for null/undefined results', async () => {
    const tool: ToolDefinition = {
      name: 'void',
      execute: async () => undefined,
    }
    const result = await executeToolCall(tool, {}, { messages: [], call: baseCall })
    expect(result).toBe('')
  })

  it('throws on tool execution error', async () => {
    const tool: ToolDefinition = {
      name: 'fail',
      execute: async () => { throw new Error('tool broke') },
    }
    await expect(
      executeToolCall(tool, {}, { messages: [], call: baseCall })
    ).rejects.toThrow('tool broke')
  })
})

function createMockSource(chunks: StreamChunk[]): StreamSource {
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
}

describe('consumeStream', () => {
  it('calls onText for text chunks and accumulates content', async () => {
    const texts: string[] = []
    const source = createMockSource([
      { type: 'text', content: 'Hello ' },
      { type: 'text', content: 'world' },
      { type: 'done' },
    ])

    await consumeStream(source, {
      onText: (accumulated) => { texts.push(accumulated) },
      onDone: () => {},
    })

    expect(texts).toEqual(['Hello ', 'Hello world'])
  })

  it('calls onReasoning for reasoning chunks', async () => {
    const reasoning: string[] = []
    const source = createMockSource([
      { type: 'reasoning', content: 'thinking...' },
      { type: 'reasoning', content: ' more' },
      { type: 'done' },
    ])

    await consumeStream(source, {
      onReasoning: (accumulated) => { reasoning.push(accumulated) },
      onDone: () => {},
    })

    expect(reasoning).toEqual(['thinking...', 'thinking... more'])
  })

  it('calls onToolCall for tool_call chunks', async () => {
    const calls: StreamChunk[] = []
    const source = createMockSource([
      { type: 'tool_call', toolCall: { id: 't1', name: 'search', args: '{"q":"hi"}' } },
      { type: 'done' },
    ])

    await consumeStream(source, {
      onToolCall: async (chunk) => { calls.push(chunk) },
      onDone: () => {},
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].toolCall?.name).toBe('search')
  })

  it('calls onError for error chunks', async () => {
    const errors: Error[] = []
    const source = createMockSource([
      { type: 'error', content: 'something failed' },
    ])

    await consumeStream(source, {
      onError: (err) => { errors.push(err) },
      onDone: () => {},
    })

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('something failed')
  })

  it('calls onDone when stream completes normally', async () => {
    const doneFn = vi.fn()
    const source = createMockSource([
      { type: 'text', content: 'hi' },
      { type: 'done' },
    ])

    await consumeStream(source, { onDone: doneFn })

    expect(doneFn).toHaveBeenCalledWith('hi')
  })

  it('calls onToolResult for tool_result chunks', async () => {
    const results: string[] = []
    const source = createMockSource([
      { type: 'tool_result', content: 'result data' },
      { type: 'done' },
    ])

    await consumeStream(source, {
      onToolResult: (content) => { results.push(content) },
      onDone: () => {},
    })

    expect(results).toEqual(['result data'])
  })
})
