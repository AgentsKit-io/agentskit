import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockLanguageModelV3 } from 'ai/test'
import { createChatRoute, createVercelChat, type RouteRecorder } from './agent'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
}

function streamOf(parts: unknown[]) {
  return {
    stream: new ReadableStream({
      start(controller) {
        for (const part of parts) controller.enqueue(part)
        controller.close()
      },
    }),
  }
}

// Step 1: the model asks for the tool. Step 2: it answers with streamed text.
function mockModel() {
  return new MockLanguageModelV3({
    doStream: [
      streamOf([
        { type: 'stream-start', warnings: [] },
        { type: 'tool-call', toolCallId: 'call-1', toolName: 'weather', input: '{"city":"Lisbon"}' },
        { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
      ]),
      streamOf([
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'Lisbon is ' },
        { type: 'text-delta', id: 't1', delta: 'sunny.' },
        { type: 'text-end', id: 't1' },
        { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
      ]),
    ],
  } as ConstructorParameters<typeof MockLanguageModelV3>[0])
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('coexistence-vercel-ai fixture', () => {
  it('streams a tool-using AI SDK route into an AgentsKit controller, offline', async () => {
    const recorder: RouteRecorder = { toolCalls: [] }
    const model = mockModel()
    const route = createChatRoute(model, recorder)
    const requests: string[] = []
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      requests.push(String(url))
      return route(new Request('http://local.test/api/chat', init))
    })

    const chat = createVercelChat('http://local.test/api/chat')
    const seen: string[] = []
    chat.subscribe(() => {
      const last = chat.getState().messages.at(-1)
      if (last?.role === 'assistant') seen.push(last.content)
    })
    await chat.send('Weather in Lisbon?')

    const state = chat.getState()
    expect(state.status).toBe('idle')
    expect(requests).toEqual(['http://local.test/api/chat'])
    expect(recorder.toolCalls).toEqual([{ city: 'Lisbon' }])
    expect(model.doStreamCalls).toHaveLength(2)
    expect(state.messages.map(message => [message.role, message.content])).toEqual([
      ['user', 'Weather in Lisbon?'],
      ['assistant', 'Lisbon is sunny.'],
    ])
    // The text arrived incrementally, not in one block.
    expect(seen).toContain('Lisbon is ')
  })

  it('surfaces a route failure as a controller error', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 500 }))
    const chat = createVercelChat('http://local.test/api/chat')
    await chat.send('hi')
    expect(chat.getState().status).toBe('error')
  })
})
