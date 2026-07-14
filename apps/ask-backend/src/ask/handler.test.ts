import { describe, expect, it } from 'vitest'
import type { AdapterFactory, Retriever } from '@agentskit/core'
import { AskCache } from './cache'
import { createAskHandler } from './handler'

function adapter(text: string): AdapterFactory {
  return {
    createSource: () => ({
      abort() {},
      async *stream() {
        yield { type: 'text' as const, content: text }
        yield { type: 'done' as const }
      },
    }),
  }
}

function request(query: string): Request {
  return new Request('http://ask.test/v1/ask', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: query }] }),
  })
}

describe('createAskHandler cache integration', () => {
  it('replays cached events without retrieving or invoking the adapter', async () => {
    let retrieveCalls = 0
    const cache = new AskCache({ namespace: 'handler-cache', embed: async () => [1, 0] })
    const retriever: Retriever = {
      async retrieve() {
        retrieveCalls += 1
        return [{ id: 'doc', content: 'Docs context', score: 1, metadata: { path: '/docs', title: 'Docs' } }]
      },
    }
    const handler = createAskHandler({
      retriever,
      adapter: adapter('Fresh answer'),
      systemPrompt: 'Answer from docs.',
      sanitize: (messages) => messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      triage: () => ({ kind: 'ok' }),
      checkScope: async () => ({ inScope: true }),
      cache: {
        corpus: 'docs',
        persona: 'docs-helper',
        promptVersion: 'test',
        getAnswer: (key) => cache.getAnswer(key),
        setAnswer: (key, value) => cache.setAnswer(key, value),
        getRetrieval: (key) => cache.getRetrieval(key),
        setRetrieval: (key, docs) => cache.setRetrieval(key, docs),
      },
    })

    await expect((await handler(request('What is AgentsKit?'))).text()).resolves.toContain('Fresh answer')
    await expect((await handler(request('What is AgentsKit?'))).text()).resolves.toContain('Fresh answer')

    expect(retrieveCalls).toBe(1)
  })

  it('does not cache a stream cancelled after partial output', async () => {
    let releaseProvider: (() => void) | undefined
    let cacheWrites = 0
    const handler = createAskHandler({
      retriever: {
        async retrieve() {
          return [{ id: 'doc', content: 'Docs context', score: 1, metadata: { path: '/docs', title: 'Docs' } }]
        },
      },
      adapter: {
        createSource: () => ({
          abort() {
            releaseProvider?.()
          },
          async *stream() {
            yield { type: 'text' as const, content: 'You can use' }
            await new Promise<void>((resolve) => {
              releaseProvider = resolve
            })
          },
        }),
      },
      systemPrompt: 'Answer from docs.',
      sanitize: (messages) => messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      triage: () => ({ kind: 'ok' }),
      checkScope: async () => ({ inScope: true }),
      cache: {
        corpus: 'registry',
        persona: 'registry-helper',
        getAnswer: async () => undefined,
        setAnswer: async () => {
          cacheWrites += 1
        },
      },
    })

    const response = await handler(request('Which agent reviews code?'))
    expect(response.headers.get('content-type')).toBe('application/x-ndjson; charset=utf-8')
    const reader = response.body!.getReader()
    await reader.read()
    await reader.cancel()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(cacheWrites).toBe(0)
  })

  it('regenerates an incomplete persisted answer and then replays the replacement', async () => {
    let stored: unknown = {
      model: 'test-model',
      createdAt: 1,
      events: [{ type: 'text', delta: 'You can use' }],
    }
    let adapterCalls = 0
    const cache = new AskCache({
      namespace: 'handler-incomplete-cache',
      storage: {
        async get() {
          return stored
        },
        async set(_key, value) {
          stored = value
        },
      },
    })
    const handler = createAskHandler({
      retriever: {
        async retrieve() {
          return [{ id: 'doc', content: 'Docs context', score: 1, metadata: { path: '/docs', title: 'Docs' } }]
        },
      },
      adapter: {
        createSource: () => ({
          abort() {},
          async *stream() {
            adapterCalls += 1
            yield { type: 'text' as const, content: 'Use the code reviewer.' }
            yield { type: 'done' as const }
          },
        }),
      },
      systemPrompt: 'Answer from docs.',
      sanitize: (messages) => messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      triage: () => ({ kind: 'ok' }),
      checkScope: async () => ({ inScope: true }),
      cache: {
        corpus: 'registry',
        persona: 'registry-helper',
        getAnswer: (cacheKey) => cache.getAnswer(cacheKey),
        setAnswer: (cacheKey, value) => cache.setAnswer(cacheKey, value),
      },
    })

    const first = await handler(request('Which agent reviews code?'))
    await expect(first.text()).resolves.toContain('Use the code reviewer.')
    const second = await handler(request('Which agent reviews code?'))
    await expect(second.text()).resolves.toContain('Use the code reviewer.')

    expect(adapterCalls).toBe(1)
    expect(second.headers.get('x-ask-cache')).toBe('exact')
  })

  it('does not synthesize completion or cache when an adapter ends silently', async () => {
    let cacheWrites = 0
    const handler = createAskHandler({
      retriever: {
        async retrieve() {
          return [{ id: 'doc', content: 'Docs context', score: 1, metadata: { path: '/docs', title: 'Docs' } }]
        },
      },
      adapter: {
        createSource: () => ({
          abort() {},
          async *stream() {
            yield { type: 'text' as const, content: 'Partial answer' }
          },
        }),
      },
      systemPrompt: 'Answer from docs.',
      sanitize: (messages) => messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      triage: () => ({ kind: 'ok' }),
      checkScope: async () => ({ inScope: true }),
      cache: {
        corpus: 'registry',
        persona: 'registry-helper',
        getAnswer: async () => undefined,
        setAnswer: async () => {
          cacheWrites += 1
        },
      },
    })
    const source = handler(request('Which agent reviews code?'))

    const response = await source
    const body = await response.text()

    expect(body).toContain('Partial answer')
    expect(body).toContain('"type":"error"')
    expect(body).not.toContain('"type":"done"')
    expect(cacheWrites).toBe(0)
  })
})
