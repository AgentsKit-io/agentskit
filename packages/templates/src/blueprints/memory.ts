import { camelCase, pascalCase } from './utils'

/**
 * Skeleton for a vector-memory backend that follows the
 * `@agentskit/core` `VectorMemory` contract. Author fills in the three
 * methods (`store`, `search`, `delete`) and any backend-specific
 * client wiring.
 */
export function generateVectorMemorySource(name: string): string {
  return `import { ErrorCodes, MemoryError } from '@agentskit/core'
import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

export interface ${pascalCase(name)}Config {
  /** Backend URL — use whatever your provider exposes. */
  url: string
  /** Auth token. Optional for self-hosted setups. */
  apiKey?: string
  /** Default topK for \`search\`. */
  topK?: number
  /** Override fetch (mainly for tests). */
  fetch?: typeof globalThis.fetch
}

async function call<T>(config: ${pascalCase(name)}Config, path: string, body: unknown): Promise<T> {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const response = await fetchImpl(\`\${config.url}\${path}\`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.apiKey ? { authorization: \`Bearer \${config.apiKey}\` } : {}),
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
      message: \`${name} \${response.status}: \${text.slice(0, 200)}\`,
      hint: \`URL \${config.url}\${path}.\`,
    })
  }
  return (text.length > 0 ? JSON.parse(text) : {}) as T
}

export function ${camelCase(name)}(config: ${pascalCase(name)}Config): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)

  return {
    async store(docs: VectorDocument[]) {
      // TODO: translate docs → backend's upsert payload + call.
      await call<unknown>(config, '/v1/upsert', { docs })
    },
    async search(embedding: number[], options) {
      const topK = options?.topK ?? defaultTopK
      const result = await call<{ matches: Array<{ id: string; score: number; metadata?: Record<string, unknown>; content?: string }> }>(
        config,
        '/v1/query',
        { vector: embedding, topK, filter: options?.filter },
      )
      return result.matches.map((m): RetrievedDocument => ({
        id: m.id,
        content: m.content ?? '',
        score: m.score,
        metadata: m.metadata,
      }))
    },
    async delete(ids: string[]) {
      await call<unknown>(config, '/v1/delete', { ids })
    },
  }
}
`
}

export function generateVectorMemoryTest(name: string): string {
  return `import { afterEach, describe, expect, it, vi } from 'vitest'
import { ${camelCase(name)} } from '../src/index'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('${name}', () => {
  it('stores documents via the upsert endpoint', async () => {
    const calls: Array<{ url: string; body: string }> = []
    globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body as string })
      return new Response('{}', { status: 200 })
    }) as unknown as typeof globalThis.fetch

    const memory = ${camelCase(name)}({ url: 'https://example/v1' })
    await memory.store([{ id: '1', content: 'hi', embedding: [0.1, 0.2] }])
    expect(calls[0]!.url).toContain('/v1/upsert')
  })

  it('throws MemoryError on non-2xx', async () => {
    globalThis.fetch = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof globalThis.fetch
    const memory = ${camelCase(name)}({ url: 'https://example/v1' })
    await expect(memory.store([{ id: '1', content: '', embedding: [0] }])).rejects.toThrow(/${name}/)
  })
})
`
}

/**
 * Chat-memory backend skeleton. Implements load + save against any
 * persistent store. Pair with \`generateVectorMemorySource\` for a
 * combined backend, or ship one without the other.
 */
export function generateChatMemorySource(name: string): string {
  return `import {
  ErrorCodes,
  MemoryError,
  deserializeMessages,
  serializeMessages,
} from '@agentskit/core'
import type { ChatMemory, Message, MemoryRecord } from '@agentskit/core'

export interface ${pascalCase(name)}Config {
  /** Connection URL or driver-specific config. */
  url: string
  /** Logical conversation id. Defaults to 'default'. */
  conversationId?: string
}

export function ${camelCase(name)}(config: ${pascalCase(name)}Config): ChatMemory {
  const conversationId = config.conversationId ?? 'default'

  // TODO: wire your backend client here (open connection, prepare statements, etc.)

  return {
    async load(): Promise<Message[]> {
      try {
        // TODO: read serialised JSON for conversationId from your store.
        const raw = '[]'
        return deserializeMessages(JSON.parse(raw) as MemoryRecord[])
      } catch (err) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_LOAD_FAILED,
          message: \`${name}: load failed for conversation \${conversationId}\`,
          cause: err,
        })
      }
    },
    async save(messages: Message[]): Promise<void> {
      try {
        const encoded = JSON.stringify(serializeMessages(messages))
        // TODO: write \`encoded\` against \`conversationId\` in your store.
        void encoded
      } catch (err) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_SAVE_FAILED,
          message: \`${name}: save failed for conversation \${conversationId}\`,
          cause: err,
        })
      }
    },
    async clear(): Promise<void> {
      // TODO: delete \`conversationId\` row(s) in your store.
    },
  }
}
`
}
