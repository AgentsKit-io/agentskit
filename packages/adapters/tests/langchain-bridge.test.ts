import { describe, expect, it } from 'vitest'
import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { createAgent, createMiddleware } from 'langchain'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'
import { mockAdapter } from '../src/mock'
import { AgentsKitChatModel, adapterToLangChainModel } from '../src/langchain-bridge'

const add = tool(
  async ({ a, b }: { a: number; b: number }) => String(a + b),
  {
    name: 'add',
    description: 'Add two numbers',
    schema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] },
  },
)

describe('adapterToLangChainModel', () => {
  it('returns a real AIMessage from a bare invoke and forwards system prompts', async () => {
    const history: AdapterRequest[] = []
    const model = adapterToLangChainModel(mockAdapter({
      history,
      response: [
        { type: 'text', content: 'Hello ' },
        { type: 'text', content: 'world' },
        { type: 'usage', usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 } },
        { type: 'done' },
      ],
    }), { modelName: 'mock-1' })
    const result = await model.invoke([new SystemMessage('be brief'), new HumanMessage('hi')])
    expect(AIMessage.isInstance(result)).toBe(true)
    expect(result.content).toBe('Hello world')
    expect(result.usage_metadata).toEqual({ input_tokens: 3, output_tokens: 2, total_tokens: 5 })
    expect(history[0]!.context?.systemPrompt).toBe('be brief')
    expect(history[0]!.messages.map(message => [message.role, message.content])).toEqual([['system', 'be brief'], ['user', 'hi']])
    expect(model.profile).toEqual({ toolCalling: true })
    expect(model._llmType()).toBe('agentskit')
  })

  it('completes a tool-calling round trip through createAgent with wrapModelCall middleware', async () => {
    const history: AdapterRequest[] = []
    const adapter = mockAdapter({
      history,
      response: [
        [{ type: 'tool_call', toolCall: { id: 'call-1', name: 'add', args: '{"a":2,"b":3}' } }, { type: 'done' }],
        [{ type: 'text', content: 'The sum is 5.' }, { type: 'done' }],
      ],
    })
    const wrapped: string[] = []
    const middleware = createMiddleware({
      name: 'observe',
      wrapModelCall: async (request, handler) => {
        const response = await handler(request)
        wrapped.push(AIMessage.isInstance(response) ? 'ai' : typeof response)
        return response
      },
    })
    const agent = createAgent({ model: adapterToLangChainModel(adapter), tools: [add], middleware: [middleware] })
    const result = await agent.invoke({ messages: [new HumanMessage('what is 2 + 3?')] })

    expect(wrapped).toEqual(['ai', 'ai'])
    const messages = result.messages
    expect(messages.map(message => message.type)).toEqual(['human', 'ai', 'tool', 'ai'])
    expect((messages[1] as AIMessage).tool_calls).toEqual([{ id: 'call-1', name: 'add', args: { a: 2, b: 3 }, type: 'tool_call' }])
    expect((messages[2] as ToolMessage).content).toBe('5')
    expect(messages[3]!.content).toBe('The sum is 5.')

    // The adapter saw the bound tool schema, then the assistant call + tool result.
    expect(history[0]!.context?.tools).toEqual([{ name: 'add', description: 'Add two numbers', schema: expect.objectContaining({ type: 'object' }) }])
    const second = history[1]!.messages
    expect(second.map(message => message.role)).toEqual(['user', 'assistant', 'tool'])
    expect(second[1]!.toolCalls).toEqual([{ id: 'call-1', name: 'add', args: { a: 2, b: 3 }, status: 'complete' }])
    expect(second[2]).toMatchObject({ role: 'tool', content: '5', toolCallId: 'call-1' })
  })

  it('satisfies createAgent responseFormat via the tool strategy alongside middleware', async () => {
    const adapter = mockAdapter({
      response: (request: AdapterRequest): StreamChunk[] => {
        const structured = request.context?.tools?.find(candidate => candidate.name !== 'add')
        if (!structured) throw new Error('structured output tool was not bound')
        return [
          { type: 'tool_call', toolCall: { id: 'call-2', name: structured.name, args: '{"answer":5}' } },
          { type: 'done' },
        ]
      },
    })
    const middleware = createMiddleware({ name: 'passthrough', wrapModelCall: (request, handler) => handler(request) })
    const agent = createAgent({
      model: adapterToLangChainModel(adapter),
      tools: [add],
      middleware: [middleware],
      responseFormat: { type: 'object', properties: { answer: { type: 'number' } }, required: ['answer'] },
    })
    const result = await agent.invoke({ messages: [new HumanMessage('answer')] })
    expect(result.structuredResponse).toEqual({ answer: 5 })
  })

  it('streams text and tool-call chunks as AIMessageChunk instances', async () => {
    const model = new AgentsKitChatModel(mockAdapter({
      response: [
        { type: 'text', content: 'a' },
        { type: 'tool_call', toolCall: { id: 'c', name: 'add', args: '{"a":1,"b":1}' } },
        { type: 'text', content: 'b' },
        { type: 'done' },
      ],
    }))
    let merged: AIMessageChunk | undefined
    for await (const chunk of await model.stream('go')) {
      expect(AIMessageChunk.isInstance(chunk)).toBe(true)
      merged = merged ? merged.concat(chunk) : chunk
    }
    expect(merged?.content).toBe('ab')
    expect(merged?.tool_calls).toEqual([{ id: 'c', name: 'add', args: { a: 1, b: 1 }, type: 'tool_call' }])
  })

  it('surfaces adapter errors and honours abort signals', async () => {
    const failing = adapterToLangChainModel(mockAdapter({ response: [{ type: 'error', content: 'provider down' }] }))
    await expect(failing.invoke('x')).rejects.toThrow('provider down')

    const controller = new AbortController()
    controller.abort()
    const slow = adapterToLangChainModel(mockAdapter({ response: [{ type: 'text', content: 'never' }, { type: 'done' }], delayMs: 50 }))
    await expect(slow.invoke('x', { signal: controller.signal })).rejects.toThrow()
  })
})
