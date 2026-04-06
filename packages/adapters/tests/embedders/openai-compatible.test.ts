import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { deepseekEmbedder } from '../../src/embedders/deepseek'
import { grokEmbedder } from '../../src/embedders/grok'
import { kimiEmbedder } from '../../src/embedders/kimi'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('openaiCompatibleEmbedder wrappers', () => {
  describe('deepseekEmbedder', () => {
    it('requires model and calls DeepSeek endpoint', async () => {
      const mockEmbedding = [0.1, 0.2]

      server.use(
        http.post('https://api.deepseek.com/v1/embeddings', async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          expect(body).toMatchObject({ model: 'deepseek-embed', input: 'hello' })
          return HttpResponse.json({
            data: [{ embedding: mockEmbedding }],
          })
        }),
      )

      const embed = deepseekEmbedder({ apiKey: 'test-key', model: 'deepseek-embed' })
      const result = await embed('hello')

      expect(result).toEqual(mockEmbedding)
    })

    it('throws requiring model when model is omitted', () => {
      expect(() => deepseekEmbedder({ apiKey: 'key' } as never)).toThrow(/Model is required/)
    })
  })

  describe('grokEmbedder', () => {
    it('requires model and calls xAI endpoint', async () => {
      const mockEmbedding = [0.3, 0.4]

      server.use(
        http.post('https://api.x.ai/v1/embeddings', () => {
          return HttpResponse.json({
            data: [{ embedding: mockEmbedding }],
          })
        }),
      )

      const embed = grokEmbedder({ apiKey: 'test-key', model: 'grok-embed' })
      const result = await embed('test')

      expect(result).toEqual(mockEmbedding)
    })

    it('throws requiring model when model is omitted', () => {
      expect(() => grokEmbedder({ apiKey: 'key' } as never)).toThrow(/Model is required/)
    })
  })

  describe('kimiEmbedder', () => {
    it('requires model and calls Moonshot endpoint', async () => {
      const mockEmbedding = [0.5, 0.6]

      server.use(
        http.post('https://api.moonshot.ai/v1/embeddings', () => {
          return HttpResponse.json({
            data: [{ embedding: mockEmbedding }],
          })
        }),
      )

      const embed = kimiEmbedder({ apiKey: 'test-key', model: 'kimi-embed' })
      const result = await embed('test')

      expect(result).toEqual(mockEmbedding)
    })

    it('throws requiring model when model is omitted', () => {
      expect(() => kimiEmbedder({ apiKey: 'key' } as never)).toThrow(/Model is required/)
    })
  })

  describe('model discovery on error', () => {
    it('fetches available models when embedding fails', async () => {
      server.use(
        http.post('https://api.deepseek.com/v1/embeddings', () => {
          return HttpResponse.json({ error: { message: 'invalid model' } }, { status: 400 })
        }),
        http.get('https://api.deepseek.com/v1/models', () => {
          return HttpResponse.json({
            data: [{ id: 'deepseek-embed-v1' }, { id: 'deepseek-chat' }],
          })
        }),
      )

      const embed = deepseekEmbedder({ apiKey: 'test-key', model: 'bad-model' })
      await expect(embed('test')).rejects.toThrow(/deepseek-embed-v1/)
    })

    it('shows fallback when model list fetch fails', async () => {
      server.use(
        http.post('https://api.deepseek.com/v1/embeddings', () => {
          return HttpResponse.json({ error: { message: 'bad' } }, { status: 400 })
        }),
        http.get('https://api.deepseek.com/v1/models', () => {
          return HttpResponse.error()
        }),
      )

      const embed = deepseekEmbedder({ apiKey: 'test-key', model: 'bad' })
      await expect(embed('test')).rejects.toThrow(/Could not fetch available models/)
    })
  })
})
