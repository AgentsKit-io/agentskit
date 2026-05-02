import { describe, expect, it } from 'vitest'
import { createStaticRetriever, formatRetrievedDocuments } from '../src/rag'

describe('createStaticRetriever', () => {
  const docs = [
    { content: 'AgentsKit core contracts', source: 'core.md' },
    { content: 'React hooks for chat UI', source: 'react.md' },
    { content: 'Memory backends and vector stores', source: 'memory.md' },
  ]

  it('scores by token overlap and orders by descending score', async () => {
    const retriever = createStaticRetriever({ documents: docs })
    const hits = await retriever.retrieve({ query: 'memory vector' })
    expect(hits).toHaveLength(1)
    expect(hits[0]!.source).toBe('memory.md')
    expect(hits[0]!.score).toBe(2)
  })

  it('respects custom limit', async () => {
    const retriever = createStaticRetriever({ documents: docs, limit: 1 })
    const hits = await retriever.retrieve({ query: 'agentskit react memory' })
    expect(hits).toHaveLength(1)
  })

  it('drops documents with zero score', async () => {
    const retriever = createStaticRetriever({ documents: docs })
    const hits = await retriever.retrieve({ query: 'kubernetes deployment' })
    expect(hits).toEqual([])
  })

  it('returns empty array when query has no tokens', async () => {
    const retriever = createStaticRetriever({ documents: docs })
    const hits = await retriever.retrieve({ query: '   ' })
    expect(hits).toEqual([])
  })

  it('uses pre-computed score when present', async () => {
    const retriever = createStaticRetriever({
      documents: [
        { content: 'kubernetes deployment', source: 'k8s.md', score: 9 },
        { content: 'agentskit core', source: 'core.md' },
      ],
    })
    const hits = await retriever.retrieve({ query: 'agentskit' })
    expect(hits[0]!.source).toBe('k8s.md')
    expect(hits[0]!.score).toBe(9)
  })

  it('matches against source field as well as content', async () => {
    const retriever = createStaticRetriever({
      documents: [{ content: 'unrelated text', source: 'agentskit-readme.md' }],
    })
    const hits = await retriever.retrieve({ query: 'agentskit' })
    expect(hits).toHaveLength(1)
  })
})

describe('formatRetrievedDocuments', () => {
  it('returns empty string when no docs', () => {
    expect(formatRetrievedDocuments([])).toBe('')
  })

  it('numbers docs and includes source line when present', () => {
    const out = formatRetrievedDocuments([
      { content: 'first', source: 'a.md' },
      { content: 'second' },
    ])
    expect(out).toContain('[1]')
    expect(out).toContain('Source: a.md')
    expect(out).toContain('first')
    expect(out).toContain('[2]')
    expect(out).toContain('second')
    expect(out).not.toContain('Source: undefined')
  })

  it('joins multiple docs with blank line', () => {
    const out = formatRetrievedDocuments([
      { content: 'a' },
      { content: 'b' },
    ])
    expect(out).toBe('[1]\na\n\n[2]\nb')
  })
})
