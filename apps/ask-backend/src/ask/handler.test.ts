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
})
