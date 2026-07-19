import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AgentsKitError } from '@agentskit/core'
import { openaiEmbedder } from '../../src/embedders/openai'
import { geminiEmbedder } from '../../src/embedders/gemini'
import { ollamaEmbedder } from '../../src/embedders/ollama'

/**
 * 200 responses with empty/malformed vectors must throw a clear typed
 * AgentsKit error — never return undefined/NaN values.
 */
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('embedder empty/malformed vector responses', () => {
  it('OpenAI-compatible: empty data array throws AgentsKitError', async () => {
    server.use(
      http.post('https://api.openai.com/v1/embeddings', () => {
        return HttpResponse.json({ data: [] })
      }),
    )
    const embed = openaiEmbedder({ apiKey: 'k' })
    let caught: unknown
    try {
      await embed('hello')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AgentsKitError)
    expect(caught).toBeInstanceOf(Error)
    expect(String((caught as Error).message).length).toBeGreaterThan(0)
  })

  it('OpenAI-compatible: missing embedding field throws AgentsKitError', async () => {
    server.use(
      http.post('https://api.openai.com/v1/embeddings', () => {
        return HttpResponse.json({ data: [{ index: 0 }] })
      }),
    )
    const embed = openaiEmbedder({ apiKey: 'k' })
    await expect(embed('hello')).rejects.toBeInstanceOf(AgentsKitError)
  })

  it('OpenAI-compatible: non-numeric vector values throw AgentsKitError', async () => {
    server.use(
      http.post('https://api.openai.com/v1/embeddings', () => {
        return HttpResponse.json({ data: [{ embedding: [0.1, Number.NaN, 0.3] }] })
      }),
    )
    const embed = openaiEmbedder({ apiKey: 'k' })
    let result: number[] | undefined
    let caught: unknown
    try {
      result = await embed('hello')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AgentsKitError)
    expect(result).toBeUndefined()
  })

  it('Gemini: missing embedding.values throws AgentsKitError', async () => {
    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004\\:embedContent',
        () => HttpResponse.json({ embedding: {} }),
      ),
    )
    const embed = geminiEmbedder({ apiKey: 'k' })
    await expect(embed('hello')).rejects.toBeInstanceOf(AgentsKitError)
  })

  it('Gemini: empty values array throws AgentsKitError', async () => {
    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004\\:embedContent',
        () => HttpResponse.json({ embedding: { values: [] } }),
      ),
    )
    const embed = geminiEmbedder({ apiKey: 'k' })
    await expect(embed('hello')).rejects.toBeInstanceOf(AgentsKitError)
  })

  it('Ollama: empty embeddings array throws AgentsKitError', async () => {
    server.use(
      http.post('http://localhost:11434/api/embed', () => {
        return HttpResponse.json({ embeddings: [] })
      }),
    )
    const embed = ollamaEmbedder({})
    await expect(embed('hello')).rejects.toBeInstanceOf(AgentsKitError)
  })

  it('Ollama: undefined first vector throws AgentsKitError (never returns undefined)', async () => {
    server.use(
      http.post('http://localhost:11434/api/embed', () => {
        return HttpResponse.json({ embeddings: [undefined] })
      }),
    )
    const embed = ollamaEmbedder({})
    let result: number[] | undefined = [1]
    let caught: unknown
    try {
      result = await embed('hello')
    } catch (err) {
      caught = err
      result = undefined
    }
    expect(caught).toBeInstanceOf(AgentsKitError)
    expect(result).toBeUndefined()
  })
})
