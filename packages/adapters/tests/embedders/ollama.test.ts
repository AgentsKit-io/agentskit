import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ollamaEmbedder } from '../../src/embedders/ollama'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ollamaEmbedder', () => {
  it('returns an embedding vector from the Ollama API', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3]

    server.use(
      http.post('http://localhost:11434/api/embed', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toMatchObject({ model: 'nomic-embed-text', input: 'hello' })
        return HttpResponse.json({ embeddings: [mockEmbedding] })
      }),
    )

    const embed = ollamaEmbedder({})
    const result = await embed('hello')

    expect(result).toEqual(mockEmbedding)
  })

  it('uses custom model and baseUrl', async () => {
    const mockEmbedding = [0.4, 0.5]

    server.use(
      http.post('http://myhost:11434/api/embed', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toMatchObject({ model: 'mxbai-embed-large' })
        return HttpResponse.json({ embeddings: [mockEmbedding] })
      }),
    )

    const embed = ollamaEmbedder({ model: 'mxbai-embed-large', baseUrl: 'http://myhost:11434' })
    const result = await embed('test')

    expect(result).toEqual(mockEmbedding)
  })

  it('throws with available models on error', async () => {
    server.use(
      http.post('http://localhost:11434/api/embed', () => {
        return HttpResponse.json({ error: 'model not found' }, { status: 400 })
      }),
      http.get('http://localhost:11434/api/tags', () => {
        return HttpResponse.json({
          models: [
            { name: 'nomic-embed-text:latest' },
            { name: 'llama3:latest' },
          ],
        })
      }),
    )

    const embed = ollamaEmbedder({})
    await expect(embed('test')).rejects.toThrow(/nomic-embed-text/)
  })

  it('shows fallback error when model list fetch fails', async () => {
    server.use(
      http.post('http://localhost:11434/api/embed', () => {
        return HttpResponse.json({ error: 'bad' }, { status: 400 })
      }),
      http.get('http://localhost:11434/api/tags', () => {
        return HttpResponse.error()
      }),
    )

    const embed = ollamaEmbedder({})
    await expect(embed('test')).rejects.toThrow(/Could not fetch available models/)
  })
})
