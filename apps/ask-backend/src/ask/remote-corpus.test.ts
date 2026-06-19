import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRemoteCorpusRetriever } from './remote-corpus'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createRemoteCorpusRetriever', () => {
  it('loads remote llms sources and ranks relevant chunks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/missing.txt')) return new Response('nope', { status: 404 })
        return new Response(
          [
            '# AKOS',
            '',
            'AKOS helps production teams govern agent runs, approvals, audit logs, and cost controls.',
            '',
            '## Unrelated',
            '',
            'Brand copy with no matching operational details.',
          ].join('\n'),
        )
      }),
    )

    const retriever = createRemoteCorpusRetriever({
      id: 'akos',
      title: 'AKOS',
      sources: [
        { title: 'Missing', url: 'https://akos.test/missing.txt' },
        { title: 'Docs', url: 'https://akos.test/llms.txt' },
      ],
    })

    const docs = await retriever.retrieve({ query: 'audit approvals cost controls', messages: [] })

    expect(docs[0]?.source).toBe('https://akos.test/llms.txt')
    expect(docs[0]?.content).toContain('govern agent runs')
  })

  it('turns registry JSON entries into searchable documents', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          schemaVersion: 1,
          agents: [
            {
              id: 'support-triage',
              title: 'Support Triage',
              description: 'Classifies customer support tickets and routes urgent escalations.',
              category: 'support',
              tags: ['support', 'triage'],
              packages: ['@agentskit/core'],
            },
          ],
        }),
      ),
    )

    const retriever = createRemoteCorpusRetriever({
      id: 'registry',
      title: 'AgentsKit Registry',
      sources: [{ title: 'Registry index', url: 'https://registry.test/r/index.json' }],
    })

    const docs = await retriever.retrieve({ query: 'customer support escalations', messages: [] })

    expect(docs[0]?.id).toBe('support-triage')
    expect(docs[0]?.content).toContain('Support Triage')
    expect(docs[0]?.content).toContain('Tags: support, triage')
  })
})
