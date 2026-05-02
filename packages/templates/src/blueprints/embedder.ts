import { camelCase, pascalCase } from './utils'

/**
 * Embedder blueprint — produces an `EmbedFn` factory matching the
 * @agentskit/core contract. Pair with a vector memory backend
 * (createRAG, fileVectorMemory, pgvector, etc.).
 */
export function generateEmbedderSource(name: string): string {
  return `import type { EmbedFn } from '@agentskit/core'

export interface ${pascalCase(name)}EmbedderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

export function ${camelCase(name)}Embedder(config: ${pascalCase(name)}EmbedderConfig): EmbedFn {
  const model = config.model ?? 'text-embedding-3-small'
  const baseUrl = (config.baseUrl ?? 'https://api.example.com').replace(/\\/$/, '')

  return async (text: string): Promise<number[]> => {
    const url = \`\${baseUrl}/v1/embeddings\`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: \`Bearer \${config.apiKey}\`,
      },
      body: JSON.stringify({ model, input: text }),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(\`embedder \${model} HTTP \${response.status}: \${body.slice(0, 200)}\`)
    }
    const json = (await response.json()) as { data?: Array<{ embedding: number[] }> }
    const first = json.data?.[0]?.embedding
    if (!first) throw new Error(\`embedder \${model}: response missing data[0].embedding\`)
    return first
  }
}
`
}

export function generateEmbedderTest(name: string): string {
  return `import { afterEach, describe, expect, it, vi } from 'vitest'
import { ${camelCase(name)}Embedder } from '../src/index'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

describe('${name}Embedder', () => {
  it('returns embedding vector on success', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2] }] }), { status: 200 }),
    ) as unknown as typeof fetch
    const embed = ${camelCase(name)}Embedder({ apiKey: 'k' })
    expect(await embed('hi')).toEqual([0.1, 0.2])
  })

  it('throws on non-2xx', async () => {
    globalThis.fetch = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch
    const embed = ${camelCase(name)}Embedder({ apiKey: 'k' })
    await expect(embed('hi')).rejects.toThrow(/HTTP 500/)
  })
})
`
}

/**
 * Browser-only / WebGPU adapter blueprint — same shape as the
 * `webllm` adapter that ships in @agentskit/adapters. Caller
 * provides an async `getEngine()` that resolves a model engine
 * lazily (model download + WASM compile happen on first stream).
 */
export function generateBrowserAdapterSource(name: string): string {
  return `import type { AdapterFactory, StreamChunk } from '@agentskit/core'

export interface ${pascalCase(name)}EngineLike {
  reload(model: string): Promise<void>
  chat: {
    completions: {
      create(params: {
        messages: Array<{ role: string; content: string }>
        stream: true
      }): AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>
    }
  }
}

export interface ${pascalCase(name)}Config {
  /** Browser-side model id. */
  model: string
  /** Pre-loaded engine. If omitted, the adapter dynamically imports. */
  engine?: ${pascalCase(name)}EngineLike
  /** Progress callback while the engine loads. */
  onProgress?: (info: { progress: number; text: string }) => void
}

let cached: Promise<${pascalCase(name)}EngineLike> | null = null

async function loadEngine(config: ${pascalCase(name)}Config): Promise<${pascalCase(name)}EngineLike> {
  if (config.engine) return config.engine
  if (cached) return cached
  cached = (async () => {
    // TODO: replace this dynamic import with the real engine loader,
    // e.g. \`await import('@mlc-ai/web-llm')\` for MLC.
    throw new Error('${name} engine loader not implemented')
  })()
  return cached
}

export function ${camelCase(name)}(config: ${pascalCase(name)}Config): AdapterFactory {
  return {
    capabilities: { tools: false },
    createSource: (request) => {
      let aborted = false
      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          try {
            const engine = await loadEngine(config)
            const messages = request.messages.map(m => ({
              role: String(m.role),
              content: typeof m.content === 'string' ? m.content : '',
            }))
            const iter = engine.chat.completions.create({ messages, stream: true })
            for await (const chunk of iter) {
              if (aborted) return
              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) yield { type: 'text', content: delta }
            }
            yield { type: 'done' }
          } catch (err) {
            yield { type: 'error', content: err instanceof Error ? err.message : String(err) }
          }
        },
        abort: () => {
          aborted = true
        },
      }
    },
  }
}
`
}
