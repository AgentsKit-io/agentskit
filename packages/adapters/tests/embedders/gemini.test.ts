import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { geminiEmbedder } from '../../src/embedders/gemini'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('geminiEmbedder', () => {
  it('returns an embedding vector from the Gemini API', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3]

    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004\\:embedContent',
        ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('key')).toBe('test-key')
          return HttpResponse.json({
            embedding: { values: mockEmbedding },
          })
        },
      ),
    )

    const embed = geminiEmbedder({ apiKey: 'test-key' })
    const result = await embed('hello')

    expect(result).toEqual(mockEmbedding)
  })

  it('uses custom model', async () => {
    const mockEmbedding = [0.5, 0.6]

    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/custom-model\\:embedContent',
        () => {
          return HttpResponse.json({
            embedding: { values: mockEmbedding },
          })
        },
      ),
    )

    const embed = geminiEmbedder({ apiKey: 'test-key', model: 'custom-model' })
    const result = await embed('test')

    expect(result).toEqual(mockEmbedding)
  })

  it('throws with available models on error', async () => {
    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004\\:embedContent',
        () => {
          return HttpResponse.json({ error: { message: 'bad request' } }, { status: 400 })
        },
      ),
      http.get(
        'https://generativelanguage.googleapis.com/v1beta/models',
        () => {
          return HttpResponse.json({
            models: [
              { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
              { name: 'models/gemini-pro', supportedGenerationMethods: ['generateContent'] },
            ],
          })
        },
      ),
    )

    const embed = geminiEmbedder({ apiKey: 'test-key' })
    await expect(embed('test')).rejects.toThrow(/text-embedding-004/)
  })

  it('shows fallback error when model list fetch fails', async () => {
    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004\\:embedContent',
        () => {
          return HttpResponse.json({ error: { message: 'bad' } }, { status: 400 })
        },
      ),
      http.get('https://generativelanguage.googleapis.com/v1beta/models', () => {
        return HttpResponse.error()
      }),
    )

    const embed = geminiEmbedder({ apiKey: 'test-key' })
    await expect(embed('test')).rejects.toThrow(/Could not fetch available models/)
  })
})
