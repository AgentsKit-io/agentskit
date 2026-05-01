import { describe, expect, it, vi } from 'vitest'
import { webllm, webllmAdapter, type WebLlmEngineLike } from '../src/webllm'
import type { StreamChunk } from '@agentskit/core'

async function* mockCompletion(parts: string[]): AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }> {
  for (const text of parts) yield { choices: [{ delta: { content: text } }] }
}

function fakeEngine(parts: string[]): WebLlmEngineLike {
  return {
    reload: vi.fn(),
    chat: {
      completions: {
        create: vi.fn(async () => mockCompletion(parts)),
      },
    },
  }
}

async function collect(factory: ReturnType<typeof webllm>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const chunk of factory.createSource({
    messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
  }).stream()) {
    out.push(chunk)
  }
  return out
}

describe('webllmAdapter', () => {
  it('declares streaming-only capabilities', () => {
    const factory = webllm({ model: 'Llama', engine: fakeEngine([]) })
    expect(factory.capabilities).toEqual({ streaming: true, tools: false })
  })

  it('exports as webllmAdapter alias', () => {
    expect(webllmAdapter).toBe(webllm)
  })

  it('streams text deltas from the engine', async () => {
    const factory = webllm({
      model: 'Llama',
      engine: fakeEngine(['Hel', 'lo', ' there']),
    })
    const out = await collect(factory)
    const texts = out.filter(c => c.type === 'text').map(c => (c as { content: string }).content)
    expect(texts.join('')).toBe('Hello there')
    expect(out[out.length - 1]?.type).toBe('done')
  })

  it('surfaces engine errors as error chunks', async () => {
    const engine: WebLlmEngineLike = {
      reload: vi.fn(),
      chat: {
        completions: {
          create: vi.fn(async () => { throw new Error('engine boom') }),
        },
      },
    }
    const out = await collect(webllm({ model: 'Llama', engine }))
    expect(out[0].type).toBe('error')
    expect((out[0] as { content: string }).content).toContain('engine boom')
  })
})
