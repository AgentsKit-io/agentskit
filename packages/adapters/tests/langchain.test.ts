import { describe, expect, it } from 'vitest'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'
import { langchain, langgraph } from '../src/langchain'

const request: AdapterRequest = {
  messages: [
    { id: '1', role: 'user', content: 'hello', status: 'complete', createdAt: new Date() },
  ],
  tools: [],
}

async function drain(adapter: ReturnType<typeof langchain>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const c of adapter.createSource(request).stream()) out.push(c)
  return out
}

describe('langchain adapter', () => {
  it('streams text from a stream-mode runnable yielding strings', async () => {
    const adapter = langchain({
      runnable: {
        stream: async function* () {
          yield 'foo'
          yield 'bar'
        },
      },
    })
    const chunks = await drain(adapter)
    expect(chunks.filter(c => c.type === 'text').map(c => (c as { content: string }).content)).toEqual(['foo', 'bar'])
    expect(chunks.at(-1)?.type).toBe('done')
  })

  it('extracts content field from object chunks', async () => {
    const adapter = langchain({
      runnable: {
        stream: async function* () {
          yield { content: 'hi' }
          yield { content: '' }
        },
      },
    })
    const chunks = await drain(adapter)
    expect(chunks.filter(c => c.type === 'text')).toHaveLength(1)
  })

  it('emits error chunk when runnable has neither stream nor streamEvents', async () => {
    const adapter = langchain({ runnable: {} })
    const chunks = await drain(adapter)
    expect(chunks.some(c => c.type === 'error')).toBe(true)
  })

  it('streamEvents mode emits text + tool_call events', async () => {
    const adapter = langchain({
      mode: 'events',
      runnable: {
        streamEvents: async function* () {
          yield { event: 'on_chat_model_stream', data: 'hello' }
          yield { event: 'on_tool_start', name: 'search', data: { q: 'x' }, run_id: 'r1' }
          yield { event: 'on_chat_model_end', data: '' }
        },
      },
    })
    const chunks = await drain(adapter)
    expect(chunks.some(c => c.type === 'text')).toBe(true)
    expect(chunks.some(c => c.type === 'tool_call')).toBe(true)
  })

  it('catches thrown errors and emits an error chunk', async () => {
    const adapter = langchain({
      runnable: {
        stream: async function* () {
          throw new Error('boom')
        },
      },
    })
    const chunks = await drain(adapter)
    expect(chunks.some(c => c.type === 'error' && (c as { content: string }).content.includes('boom'))).toBe(true)
  })

  it('abort is a no-op (no source-side abort wired)', () => {
    const source = langchain({ runnable: { stream: async function* () {} } }).createSource(request)
    expect(() => source.abort()).not.toThrow()
  })
})

describe('langgraph adapter', () => {
  it('delegates to langchain in events mode', async () => {
    const adapter = langgraph({
      graph: {
        streamEvents: async function* () {
          yield { event: 'on_chat_model_stream', data: 'g' }
        },
      },
    })
    const chunks = await drain(adapter)
    expect(chunks.some(c => c.type === 'text')).toBe(true)
    expect(chunks.at(-1)?.type).toBe('done')
  })
})
