import { describe, expect, it } from 'vitest'
import { AskCache } from './cache'
import type { AskCacheKey } from './handler'

const key = (query: string): AskCacheKey => ({
  corpus: 'docs',
  persona: 'docs-helper',
  promptVersion: 'test',
  query,
})

describe('AskCache', () => {
  it('returns exact cached answers', async () => {
    const cache = new AskCache({ namespace: 'test-exact', embed: async () => [1, 0] })
    await cache.setAnswer(key('How do I create an agent?'), {
      model: 'test-model',
      createdAt: 1,
      events: [
        { type: 'text', delta: 'Use createAgent.' },
        { type: 'done', model: 'test-model' },
      ],
    })

    const hit = await cache.getAnswer(key('how do i create an agent'))

    expect(hit?.source).toBe('exact')
    expect(hit?.events).toEqual([
      { type: 'text', delta: 'Use createAgent.' },
      { type: 'done', model: 'test-model' },
    ])
  })

  it('returns semantic cached answers above the threshold', async () => {
    const cache = new AskCache({
      namespace: 'test-semantic',
      semanticThreshold: 0.8,
      embed: async (text) => (text.includes('memory') || text.includes('storage') ? [1, 0] : [0, 1]),
    })
    await cache.setAnswer(key('How does memory work?'), {
      model: 'test-model',
      createdAt: 1,
      events: [
        { type: 'text', delta: 'Memory stores context.' },
        { type: 'done', model: 'test-model' },
      ],
    })

    const hit = await cache.getAnswer(key('Explain storage for agents'))

    expect(hit?.source).toBe('semantic')
    expect(hit?.events[0]).toEqual({ type: 'text', delta: 'Memory stores context.' })
  })

  it('stores retrieval results separately from answer persona', async () => {
    const cache = new AskCache({ namespace: 'test-retrieval' })
    await cache.setRetrieval(key('rag'), [{ id: '1', content: 'RAG docs', score: 0.9, metadata: { path: '/docs/rag' } }])

    await expect(cache.getRetrieval(key('rag'))).resolves.toEqual([
      { id: '1', content: 'RAG docs', score: 0.9, metadata: { path: '/docs/rag' } },
    ])
  })
})
