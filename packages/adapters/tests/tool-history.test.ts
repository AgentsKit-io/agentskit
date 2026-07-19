import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Message } from '@agentskit/core'
import { anthropic } from '../src/anthropic'
import { gemini } from '../src/gemini'
import { vertex } from '../src/vertex'
import { bedrock, type BedrockRuntimeClientLike } from '../src/bedrock'
import { ollama } from '../src/ollama'

/**
 * Multi-turn tool history wire shapes (providers with tools: true).
 * Ollama declares tools: false — not required to round-trip tool history.
 */

const multiTurn: Message[] = [
  {
    id: 'u1',
    role: 'user',
    content: 'What is the weather in Paris?',
    status: 'complete',
    createdAt: new Date(0),
  },
  {
    id: 'a1',
    role: 'assistant',
    content: '',
    status: 'complete',
    createdAt: new Date(1),
    toolCalls: [
      {
        id: 'call_1',
        name: 'get_weather',
        args: { location: 'Paris' },
        status: 'complete',
      },
    ],
  },
  {
    id: 't1',
    role: 'tool',
    content: '{"temp":18}',
    toolCallId: 'call_1',
    status: 'complete',
    createdAt: new Date(2),
  },
  {
    id: 'u2',
    role: 'user',
    content: 'Thanks',
    status: 'complete',
    createdAt: new Date(3),
  },
]

let originalFetch: typeof globalThis.fetch
beforeEach(() => {
  originalFetch = globalThis.fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

async function captureBody(
  run: () => Promise<void>,
): Promise<{ body: unknown; url?: string }> {
  let body: unknown
  let url: string | undefined
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    body = init?.body
    throw new Error('stub')
  }) as typeof globalThis.fetch
  try {
    await run()
  } catch {
    /* expected */
  }
  return { body, url }
}

async function drain(factory: { createSource: (r: { messages: Message[] }) => { stream: () => AsyncIterableIterator<unknown> } }, messages: Message[]): Promise<void> {
  const iter = factory.createSource({ messages }).stream()[Symbol.asyncIterator]()
  try {
    while (!(await iter.next()).done) {
      /* drain */
    }
  } catch {
    /* expected */
  }
}

describe('multi-turn tool history wire shapes', () => {
  it('Anthropic serializes assistant tool_use and user tool_result blocks', async () => {
    const { body } = await captureBody(async () => {
      await drain(
        anthropic({ apiKey: 'k', model: 'claude-sonnet-4-6', retry: { maxAttempts: 1, sleep: async () => {} } }),
        multiTurn,
      )
    })
    const parsed = JSON.parse(String(body)) as {
      messages: Array<{ role: string; content: unknown }>
    }

    const assistant = parsed.messages.find(m => m.role === 'assistant')
    expect(assistant).toBeDefined()
    expect(Array.isArray(assistant!.content)).toBe(true)
    const assistantBlocks = assistant!.content as Array<{ type: string; id?: string; name?: string; input?: unknown }>
    expect(assistantBlocks.some(b => b.type === 'tool_use' && b.id === 'call_1' && b.name === 'get_weather')).toBe(true)

    const toolResultMsg = parsed.messages.find(m => {
      if (!Array.isArray(m.content)) return false
      return (m.content as Array<{ type?: string }>).some(b => b.type === 'tool_result')
    })
    expect(toolResultMsg).toBeDefined()
    const toolBlocks = toolResultMsg!.content as Array<{ type: string; tool_use_id?: string; content?: string }>
    expect(toolBlocks.some(b => b.type === 'tool_result' && b.tool_use_id === 'call_1')).toBe(true)
  })

  it('Gemini serializes functionCall / functionResponse parts', async () => {
    const { body } = await captureBody(async () => {
      await drain(
        gemini({ apiKey: 'k', model: 'gemini-2.5-flash', retry: { maxAttempts: 1, sleep: async () => {} } }),
        multiTurn,
      )
    })
    const parsed = JSON.parse(String(body)) as {
      contents: Array<{ role: string; parts: Array<Record<string, unknown>> }>
    }

    const modelTurn = parsed.contents.find(c =>
      c.parts.some(p => p.functionCall !== undefined),
    )
    expect(modelTurn).toBeDefined()
    expect(modelTurn!.parts.some(p => {
      const fc = p.functionCall as { name?: string } | undefined
      return fc?.name === 'get_weather'
    })).toBe(true)

    const responseTurn = parsed.contents.find(c =>
      c.parts.some(p => p.functionResponse !== undefined),
    )
    expect(responseTurn).toBeDefined()
    expect(responseTurn!.parts.some(p => {
      const fr = p.functionResponse as { name?: string } | undefined
      return fr?.name === 'get_weather'
    })).toBe(true)
  })

  it('Vertex serializes functionCall / functionResponse parts', async () => {
    const { body } = await captureBody(async () => {
      await drain(
        vertex({
          project: 'p',
          region: 'us-central1',
          model: 'gemini-2.5-pro',
          accessToken: 'tok',
          retry: { maxAttempts: 1, sleep: async () => {} },
        }),
        multiTurn,
      )
    })
    const parsed = JSON.parse(String(body)) as {
      contents: Array<{ role: string; parts: Array<Record<string, unknown>> }>
    }

    expect(parsed.contents.some(c => c.parts.some(p => p.functionCall !== undefined))).toBe(true)
    expect(parsed.contents.some(c => c.parts.some(p => p.functionResponse !== undefined))).toBe(true)
  })

  it('Bedrock Anthropic body uses tool_use / tool_result content blocks', async () => {
    const sendSpy = vi.fn(async () => ({ body: (async function* () {})() }))
    const client: BedrockRuntimeClientLike = {
      send: sendSpy as unknown as BedrockRuntimeClientLike['send'],
    }
    const factory = bedrock({
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      client,
    })
    await drain(factory, multiTurn)

    expect(sendSpy).toHaveBeenCalled()
    const command = sendSpy.mock.calls[0]![0] as { input: { body: string } }
    const parsed = JSON.parse(command.input.body) as {
      messages: Array<{ role: string; content: unknown }>
    }

    const hasToolUse = parsed.messages.some(m =>
      Array.isArray(m.content) &&
      (m.content as Array<{ type?: string }>).some(b => b.type === 'tool_use'),
    )
    const hasToolResult = parsed.messages.some(m =>
      Array.isArray(m.content) &&
      (m.content as Array<{ type?: string }>).some(b => b.type === 'tool_result'),
    )
    expect(hasToolUse).toBe(true)
    expect(hasToolResult).toBe(true)
  })

  it('does not demand tool history from Ollama (capabilities.tools is false)', () => {
    const factory = ollama({ model: 'llama3.1' })
    expect(factory.capabilities?.tools).toBe(false)
  })
})
