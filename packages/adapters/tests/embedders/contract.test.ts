import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  openaiEmbedder,
  geminiEmbedder,
  ollamaEmbedder,
  deepseekEmbedder,
  grokEmbedder,
  kimiEmbedder,
} from '../../src/embedders'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const mockOpenAIResponse = (url: string) =>
  http.post(url, () =>
    HttpResponse.json({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
  )

const embedders = [
  {
    name: 'openaiEmbedder',
    create: () => openaiEmbedder({ apiKey: 'k' }),
    mock: () => mockOpenAIResponse('https://api.openai.com/v1/embeddings'),
  },
  {
    name: 'geminiEmbedder',
    create: () => geminiEmbedder({ apiKey: 'k' }),
    mock: () =>
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004\\:embedContent',
        () => HttpResponse.json({ embedding: { values: [0.1, 0.2, 0.3] } }),
      ),
  },
  {
    name: 'ollamaEmbedder',
    create: () => ollamaEmbedder({}),
    mock: () =>
      http.post('http://localhost:11434/api/embed', () =>
        HttpResponse.json({ embeddings: [[0.1, 0.2, 0.3]] }),
      ),
  },
  {
    name: 'deepseekEmbedder',
    create: () => deepseekEmbedder({ apiKey: 'k', model: 'm' }),
    mock: () => mockOpenAIResponse('https://api.deepseek.com/v1/embeddings'),
  },
  {
    name: 'grokEmbedder',
    create: () => grokEmbedder({ apiKey: 'k', model: 'm' }),
    mock: () => mockOpenAIResponse('https://api.x.ai/v1/embeddings'),
  },
  {
    name: 'kimiEmbedder',
    create: () => kimiEmbedder({ apiKey: 'k', model: 'm' }),
    mock: () => mockOpenAIResponse('https://api.moonshot.ai/v1/embeddings'),
  },
]

describe('EmbedFn contract', () => {
  for (const { name, create, mock } of embedders) {
    describe(name, () => {
      it('returns a function', () => {
        const embed = create()
        expect(typeof embed).toBe('function')
      })

      it('returns number[] from a string input', async () => {
        server.use(mock())
        const embed = create()
        const result = await embed('test input')

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        result.forEach(v => expect(typeof v).toBe('number'))
      })
    })
  }
})
