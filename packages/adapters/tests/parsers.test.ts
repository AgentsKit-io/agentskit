import { describe, it, expect } from 'vitest'
import type { StreamChunk } from '@agentskit/core'
import {
  parseOpenAIStream,
  parseAnthropicStream,
  parseGeminiStream,
  parseOllamaStream,
} from '../src/utils'

/** Create a ReadableStream from SSE-formatted lines (data: ...\n\n) */
function sseStream(lines: string[]): ReadableStream {
  const encoder = new TextEncoder()
  const raw = lines.map((l) => `data: ${l}\n\n`).join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(raw))
      controller.close()
    },
  })
}

/** Create a ReadableStream from newline-delimited JSON */
function ndjsonStream(objects: unknown[]): ReadableStream {
  const encoder = new TextEncoder()
  const raw = objects.map((o) => JSON.stringify(o) + '\n').join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(raw))
      controller.close()
    },
  })
}

async function collect(iter: AsyncIterableIterator<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of iter) {
    chunks.push(chunk)
  }
  return chunks
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------
describe('parseOpenAIStream', () => {
  it('streams text content', async () => {
    const stream = sseStream([
      JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }),
      JSON.stringify({ choices: [{ delta: { content: ' world' } }] }),
      '[DONE]',
    ])

    const chunks = await collect(parseOpenAIStream(stream))
    expect(chunks).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ])
  })

  it('accumulates tool call arguments across multiple delta chunks', async () => {
    const stream = sseStream([
      JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: 'call_abc',
              function: { name: 'get_weather', arguments: '{"lo' },
            }],
          },
        }],
      }),
      JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              function: { arguments: 'cation":' },
            }],
          },
        }],
      }),
      JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              function: { arguments: '"Paris"}' },
            }],
          },
        }],
      }),
      '[DONE]',
    ])

    const chunks = await collect(parseOpenAIStream(stream))
    const toolChunk = chunks.find((c) => c.type === 'tool_call')
    expect(toolChunk).toBeDefined()
    expect(toolChunk!.toolCall).toEqual({
      id: 'call_abc',
      name: 'get_weather',
      args: '{"location":"Paris"}',
    })
    expect(chunks[chunks.length - 1]).toEqual({ type: 'done' })
  })

  it('handles mixed text and tool calls', async () => {
    const stream = sseStream([
      JSON.stringify({ choices: [{ delta: { content: 'Let me check.' } }] }),
      JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: 'call_1',
              function: { name: 'search', arguments: '{"q":"test"}' },
            }],
          },
        }],
      }),
      '[DONE]',
    ])

    const chunks = await collect(parseOpenAIStream(stream))
    expect(chunks[0]).toEqual({ type: 'text', content: 'Let me check.' })
    expect(chunks[1]).toEqual({
      type: 'tool_call',
      toolCall: { id: 'call_1', name: 'search', args: '{"q":"test"}' },
    })
    expect(chunks[2]).toEqual({ type: 'done' })
  })

  it('handles multiple parallel tool calls', async () => {
    const stream = sseStream([
      JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [
              { index: 0, id: 'call_a', function: { name: 'foo', arguments: '{"x":1}' } },
              { index: 1, id: 'call_b', function: { name: 'bar', arguments: '{"y":2}' } },
            ],
          },
        }],
      }),
      '[DONE]',
    ])

    const chunks = await collect(parseOpenAIStream(stream))
    const toolCalls = chunks.filter((c) => c.type === 'tool_call')
    expect(toolCalls).toHaveLength(2)
    expect(toolCalls[0].toolCall!.name).toBe('foo')
    expect(toolCalls[1].toolCall!.name).toBe('bar')
  })
})

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------
describe('parseAnthropicStream', () => {
  it('streams text content', async () => {
    const stream = sseStream([
      JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } }),
      JSON.stringify({ type: 'content_block_stop', index: 0 }),
      JSON.stringify({ type: 'message_stop' }),
    ])

    const chunks = await collect(parseAnthropicStream(stream))
    expect(chunks).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ])
  })

  it('accumulates input_json_delta for tool calls', async () => {
    const stream = sseStream([
      JSON.stringify({
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 'toolu_123', name: 'get_weather' },
      }),
      JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"lo' },
      }),
      JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: 'cation' },
      }),
      JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '":"Paris"}' },
      }),
      JSON.stringify({ type: 'content_block_stop', index: 0 }),
      JSON.stringify({ type: 'message_stop' }),
    ])

    const chunks = await collect(parseAnthropicStream(stream))
    const toolChunk = chunks.find((c) => c.type === 'tool_call')
    expect(toolChunk).toBeDefined()
    expect(toolChunk!.toolCall).toEqual({
      id: 'toolu_123',
      name: 'get_weather',
      args: '{"location":"Paris"}',
    })
  })

  it('handles multiple tool calls', async () => {
    const stream = sseStream([
      JSON.stringify({
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 'toolu_1', name: 'search' },
      }),
      JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"q":"a"}' },
      }),
      JSON.stringify({ type: 'content_block_stop', index: 0 }),
      JSON.stringify({
        type: 'content_block_start',
        index: 1,
        content_block: { type: 'tool_use', id: 'toolu_2', name: 'fetch' },
      }),
      JSON.stringify({
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '{"url":"b"}' },
      }),
      JSON.stringify({ type: 'content_block_stop', index: 1 }),
      JSON.stringify({ type: 'message_stop' }),
    ])

    const chunks = await collect(parseAnthropicStream(stream))
    const toolCalls = chunks.filter((c) => c.type === 'tool_call')
    expect(toolCalls).toHaveLength(2)
    expect(toolCalls[0].toolCall!.name).toBe('search')
    expect(toolCalls[0].toolCall!.args).toBe('{"q":"a"}')
    expect(toolCalls[1].toolCall!.name).toBe('fetch')
    expect(toolCalls[1].toolCall!.args).toBe('{"url":"b"}')
  })
})

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
describe('parseGeminiStream', () => {
  it('streams text content', async () => {
    const stream = sseStream([
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Hello' }] } }],
      }),
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: ' world' }] } }],
      }),
    ])

    const chunks = await collect(parseGeminiStream(stream))
    expect(chunks).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ])
  })

  it('handles functionCall in response parts', async () => {
    const stream = sseStream([
      JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              functionCall: {
                name: 'get_weather',
                args: { location: 'Paris' },
              },
            }],
          },
        }],
      }),
    ])

    const chunks = await collect(parseGeminiStream(stream))
    const toolChunk = chunks.find((c) => c.type === 'tool_call')
    expect(toolChunk).toBeDefined()
    expect(toolChunk!.toolCall!.name).toBe('get_weather')
    expect(JSON.parse(toolChunk!.toolCall!.args)).toEqual({ location: 'Paris' })
  })

  it('handles mixed text and functionCall in same response', async () => {
    const stream = sseStream([
      JSON.stringify({
        candidates: [{
          content: {
            parts: [
              { text: 'Checking weather...' },
              { functionCall: { name: 'get_weather', args: { city: 'NYC' } } },
            ],
          },
        }],
      }),
    ])

    const chunks = await collect(parseGeminiStream(stream))
    expect(chunks[0]).toEqual({ type: 'text', content: 'Checking weather...' })
    expect(chunks[1].type).toBe('tool_call')
    expect(chunks[1].toolCall!.name).toBe('get_weather')
  })
})

// ---------------------------------------------------------------------------
// Ollama
// ---------------------------------------------------------------------------
describe('parseOllamaStream', () => {
  it('streams text content', async () => {
    const stream = ndjsonStream([
      { message: { content: 'Hello' }, done: false },
      { message: { content: ' world' }, done: false },
      { message: { content: '' }, done: true },
    ])

    const chunks = await collect(parseOllamaStream(stream))
    expect(chunks).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ])
  })

  it('handles tool calls in message.tool_calls', async () => {
    const stream = ndjsonStream([
      { message: { content: '', tool_calls: [{ function: { name: 'get_weather', arguments: { location: 'Paris' } } }] }, done: false },
      { message: { content: '' }, done: true },
    ])

    const chunks = await collect(parseOllamaStream(stream))
    const toolChunk = chunks.find((c) => c.type === 'tool_call')
    expect(toolChunk).toBeDefined()
    expect(toolChunk!.toolCall!.name).toBe('get_weather')
    expect(JSON.parse(toolChunk!.toolCall!.args)).toEqual({ location: 'Paris' })
  })

  it('handles tool calls with string arguments', async () => {
    const stream = ndjsonStream([
      { message: { content: '', tool_calls: [{ id: 'tc_1', function: { name: 'search', arguments: '{"q":"test"}' } }] }, done: false },
      { message: { content: '' }, done: true },
    ])

    const chunks = await collect(parseOllamaStream(stream))
    const toolChunk = chunks.find((c) => c.type === 'tool_call')
    expect(toolChunk).toBeDefined()
    expect(toolChunk!.toolCall).toEqual({
      id: 'tc_1',
      name: 'search',
      args: '{"q":"test"}',
    })
  })

  it('handles multiple tool calls in a single message', async () => {
    const stream = ndjsonStream([
      {
        message: {
          content: '',
          tool_calls: [
            { function: { name: 'foo', arguments: { a: 1 } } },
            { function: { name: 'bar', arguments: { b: 2 } } },
          ],
        },
        done: false,
      },
      { message: { content: '' }, done: true },
    ])

    const chunks = await collect(parseOllamaStream(stream))
    const toolCalls = chunks.filter((c) => c.type === 'tool_call')
    expect(toolCalls).toHaveLength(2)
    expect(toolCalls[0].toolCall!.name).toBe('foo')
    expect(toolCalls[1].toolCall!.name).toBe('bar')
  })
})
