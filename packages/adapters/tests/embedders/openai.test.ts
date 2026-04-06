import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { openaiEmbedder } from '../../src/embedders/openai'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('openaiEmbedder', () => {
  it('returns an embedding vector from the OpenAI API', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]

    server.use(
      http.post('https://api.openai.com/v1/embeddings', () => {
        return HttpResponse.json({
          object: 'list',
          data: [{ object: 'embedding', embedding: mockEmbedding, index: 0 }],
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 5, total_tokens: 5 },
        })
      }),
    )

    const embed = openaiEmbedder({ apiKey: 'test-key' })
    const result = await embed('hello world')

    expect(result).toEqual(mockEmbedding)
    expect(Array.isArray(result)).toBe(true)
    result.forEach(v => expect(typeof v).toBe('number'))
  })

  it('uses custom model and baseUrl', async () => {
    const mockEmbedding = [0.9, 0.8]
    let capturedBody: Record<string, unknown> = {}

    server.use(
      http.post('https://custom.api.com/v1/embeddings', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          object: 'list',
          data: [{ object: 'embedding', embedding: mockEmbedding, index: 0 }],
          model: 'text-embedding-3-large',
          usage: { prompt_tokens: 5, total_tokens: 5 },
        })
      }),
    )

    const embed = openaiEmbedder({
      apiKey: 'test-key',
      model: 'text-embedding-3-large',
      baseUrl: 'https://custom.api.com',
    })
    const result = await embed('test')

    expect(capturedBody).toMatchObject({ model: 'text-embedding-3-large', input: 'test' })
    expect(result).toEqual(mockEmbedding)
  })

  it('throws with available models when API returns an error', async () => {
    server.use(
      http.post('https://api.openai.com/v1/embeddings', () => {
        return HttpResponse.json({ error: { message: 'invalid model' } }, { status: 400 })
      }),
      http.get('https://api.openai.com/v1/models', () => {
        return HttpResponse.json({
          data: [
            { id: 'text-embedding-3-small' },
            { id: 'text-embedding-3-large' },
            { id: 'gpt-4o' },
          ],
        })
      }),
    )

    const embed = openaiEmbedder({ apiKey: 'test-key' })
    await expect(embed('test')).rejects.toThrow(/text-embedding-3-small/)
  })

  it('shows fallback error when model list fetch also fails', async () => {
    server.use(
      http.post('https://api.openai.com/v1/embeddings', () => {
        return HttpResponse.json({ error: { message: 'invalid model' } }, { status: 400 })
      }),
      http.get('https://api.openai.com/v1/models', () => {
        return HttpResponse.error()
      }),
    )

    const embed = openaiEmbedder({ apiKey: 'test-key' })
    await expect(embed('test')).rejects.toThrow(/Could not fetch available models/)
  })
})
