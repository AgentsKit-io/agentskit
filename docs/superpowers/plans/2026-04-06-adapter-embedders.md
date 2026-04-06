# Adapter Embedders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standalone embedder functions (`openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`, `deepseekEmbedder`, `grokEmbedder`, `kimiEmbedder`) to `@agentskit/adapters`, each returning an `EmbedFn` that satisfies the core embedding contract.

**Architecture:** New `src/embedders/` directory in the adapters package. A shared `openaiCompatibleEmbedder` handles the OpenAI-compatible API pattern; thin wrappers set default base URLs. Each embedder uses raw `fetch` — no SDK dependencies. On missing `model`, fetches available models from provider's API to show a helpful error. `EmbedFn` type defined in core.

**Tech Stack:** TypeScript, vitest, msw (for HTTP mocking in tests), raw fetch

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/core/src/types.ts` | Add `EmbedFn` type |
| Modify | `packages/core/src/index.ts` | Export `EmbedFn` |
| Create | `packages/adapters/src/embedders/openai.ts` | OpenAI embedder |
| Create | `packages/adapters/src/embedders/gemini.ts` | Gemini embedder |
| Create | `packages/adapters/src/embedders/ollama.ts` | Ollama embedder |
| Create | `packages/adapters/src/embedders/openai-compatible.ts` | Shared factory for OpenAI-compatible providers |
| Create | `packages/adapters/src/embedders/deepseek.ts` | DeepSeek embedder (thin wrapper) |
| Create | `packages/adapters/src/embedders/grok.ts` | Grok embedder (thin wrapper) |
| Create | `packages/adapters/src/embedders/kimi.ts` | Kimi embedder (thin wrapper) |
| Create | `packages/adapters/src/embedders/index.ts` | Barrel export for all embedders |
| Modify | `packages/adapters/src/index.ts` | Re-export embedders |
| Modify | `packages/adapters/package.json` | Add `msw` devDependency |
| Create | `packages/adapters/tests/embedders/openai.test.ts` | Tests for OpenAI embedder |
| Create | `packages/adapters/tests/embedders/gemini.test.ts` | Tests for Gemini embedder |
| Create | `packages/adapters/tests/embedders/ollama.test.ts` | Tests for Ollama embedder |
| Create | `packages/adapters/tests/embedders/openai-compatible.test.ts` | Tests for shared factory + thin wrappers |
| Create | `packages/adapters/tests/embedders/contract.test.ts` | Contract tests verifying all embedders return `number[]` |

---

### Task 1: Add `EmbedFn` type to core

**Files:**
- Modify: `packages/core/src/types.ts:204` (after `VectorMemory`)
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add the `EmbedFn` type to core types**

In `packages/core/src/types.ts`, add after the `VectorMemory` interface (after line 204):

```typescript
export type EmbedFn = (text: string) => Promise<number[]>
```

- [ ] **Step 2: Export `EmbedFn` from core index**

In `packages/core/src/index.ts`, add `EmbedFn` to the type exports:

```typescript
export type {
  // ... existing exports ...
  EmbedFn,
} from './types'
```

- [ ] **Step 3: Verify core builds**

Run: `pnpm --filter @agentskit/core build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): add EmbedFn type for embedding contract"
```

---

### Task 2: Install `msw` and set up test infrastructure

**Files:**
- Modify: `packages/adapters/package.json`

- [ ] **Step 1: Install msw**

Run: `pnpm --filter @agentskit/adapters add -D msw`

- [ ] **Step 2: Verify install**

Run: `pnpm --filter @agentskit/adapters test`
Expected: Existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add packages/adapters/package.json pnpm-lock.yaml
git commit -m "chore(adapters): add msw for HTTP mocking in embedder tests"
```

---

### Task 3: Implement `openaiEmbedder`

**Files:**
- Create: `packages/adapters/src/embedders/openai.ts`
- Create: `packages/adapters/tests/embedders/openai.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/adapters/tests/embedders/openai.test.ts`:

```typescript
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
    let capturedUrl = ''
    let capturedBody: Record<string, unknown> = {}

    server.use(
      http.post('https://custom.api.com/v1/embeddings', async ({ request }) => {
        capturedUrl = request.url
        capturedBody = await request.json() as Record<string, unknown>
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

    expect(capturedUrl).toBe('https://custom.api.com/v1/embeddings')
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/openai.test.ts`
Expected: FAIL — module `../../src/embedders/openai` not found.

- [ ] **Step 3: Write the implementation**

Create `packages/adapters/src/embedders/openai.ts`:

```typescript
import type { EmbedFn } from '@agentskit/core'

export interface OpenAIEmbedderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json() as { data: Array<{ id: string }> }
  return data.data
    .map(m => m.id)
    .filter(id => id.includes('embed'))
    .sort()
}

async function buildModelError(
  provider: string,
  baseUrl: string,
  apiKey: string,
  originalError: string,
): Promise<Error> {
  try {
    const models = await fetchAvailableModels(baseUrl, apiKey)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return new Error(
      `${provider} embedding failed: ${originalError}. Available embedding models: ${list}`,
    )
  } catch (fetchError) {
    return new Error(
      `${provider} embedding failed: ${originalError}. Could not fetch available models: ${(fetchError as Error).message}`,
    )
  }
}

export function openaiEmbedder(config: OpenAIEmbedderConfig): EmbedFn {
  const { apiKey, model = 'text-embedding-3-small', baseUrl = 'https://api.openai.com' } = config

  return async (text: string): Promise<number[]> => {
    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as { error?: { message?: string } }
      const message = errorBody.error?.message ?? `HTTP ${response.status}`
      throw await buildModelError('OpenAI', baseUrl, apiKey, message)
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> }
    return data.data[0].embedding
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/openai.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters/src/embedders/openai.ts packages/adapters/tests/embedders/openai.test.ts
git commit -m "feat(adapters): add openaiEmbedder with model discovery on error"
```

---

### Task 4: Implement `geminiEmbedder`

**Files:**
- Create: `packages/adapters/src/embedders/gemini.ts`
- Create: `packages/adapters/tests/embedders/gemini.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/adapters/tests/embedders/gemini.test.ts`:

```typescript
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
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
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
        'https://generativelanguage.googleapis.com/v1beta/models/custom-model:embedContent',
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
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
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
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/gemini.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/adapters/src/embedders/gemini.ts`:

```typescript
import type { EmbedFn } from '@agentskit/core'

export interface GeminiEmbedderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json() as {
    models: Array<{ name: string; supportedGenerationMethods: string[] }>
  }
  return data.models
    .filter(m => m.supportedGenerationMethods.includes('embedContent'))
    .map(m => m.name.replace('models/', ''))
    .sort()
}

async function buildModelError(
  baseUrl: string,
  apiKey: string,
  originalError: string,
): Promise<Error> {
  try {
    const models = await fetchAvailableModels(baseUrl, apiKey)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return new Error(
      `Gemini embedding failed: ${originalError}. Available embedding models: ${list}`,
    )
  } catch (fetchError) {
    return new Error(
      `Gemini embedding failed: ${originalError}. Could not fetch available models: ${(fetchError as Error).message}`,
    )
  }
}

export function geminiEmbedder(config: GeminiEmbedderConfig): EmbedFn {
  const {
    apiKey,
    model = 'text-embedding-004',
    baseUrl = 'https://generativelanguage.googleapis.com',
  } = config

  return async (text: string): Promise<number[]> => {
    const response = await fetch(
      `${baseUrl}/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as { error?: { message?: string } }
      const message = errorBody.error?.message ?? `HTTP ${response.status}`
      throw await buildModelError(baseUrl, apiKey, message)
    }

    const data = await response.json() as { embedding: { values: number[] } }
    return data.embedding.values
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/gemini.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters/src/embedders/gemini.ts packages/adapters/tests/embedders/gemini.test.ts
git commit -m "feat(adapters): add geminiEmbedder with model discovery on error"
```

---

### Task 5: Implement `ollamaEmbedder`

**Files:**
- Create: `packages/adapters/src/embedders/ollama.ts`
- Create: `packages/adapters/tests/embedders/ollama.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/adapters/tests/embedders/ollama.test.ts`:

```typescript
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
        const body = await request.json() as Record<string, unknown>
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
        const body = await request.json() as Record<string, unknown>
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/ollama.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/adapters/src/embedders/ollama.ts`:

```typescript
import type { EmbedFn } from '@agentskit/core'

export interface OllamaEmbedderConfig {
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/tags`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json() as { models: Array<{ name: string }> }
  return data.models
    .map(m => m.name)
    .filter(name => name.includes('embed'))
    .sort()
}

async function buildModelError(
  baseUrl: string,
  originalError: string,
): Promise<Error> {
  try {
    const models = await fetchAvailableModels(baseUrl)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return new Error(
      `Ollama embedding failed: ${originalError}. Available embedding models: ${list}`,
    )
  } catch (fetchError) {
    return new Error(
      `Ollama embedding failed: ${originalError}. Could not fetch available models: ${(fetchError as Error).message}`,
    )
  }
}

export function ollamaEmbedder(config: OllamaEmbedderConfig): EmbedFn {
  const { model = 'nomic-embed-text', baseUrl = 'http://localhost:11434' } = config

  return async (text: string): Promise<number[]> => {
    const response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as { error?: string }
      const message = errorBody.error ?? `HTTP ${response.status}`
      throw await buildModelError(baseUrl, message)
    }

    const data = await response.json() as { embeddings: number[][] }
    return data.embeddings[0]
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/ollama.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters/src/embedders/ollama.ts packages/adapters/tests/embedders/ollama.test.ts
git commit -m "feat(adapters): add ollamaEmbedder with model discovery on error"
```

---

### Task 6: Implement `openaiCompatibleEmbedder` + thin wrappers

**Files:**
- Create: `packages/adapters/src/embedders/openai-compatible.ts`
- Create: `packages/adapters/src/embedders/deepseek.ts`
- Create: `packages/adapters/src/embedders/grok.ts`
- Create: `packages/adapters/src/embedders/kimi.ts`
- Create: `packages/adapters/tests/embedders/openai-compatible.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/adapters/tests/embedders/openai-compatible.test.ts`:

```typescript
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
          const body = await request.json() as Record<string, unknown>
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/openai-compatible.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the shared factory**

Create `packages/adapters/src/embedders/openai-compatible.ts`:

```typescript
import type { EmbedFn } from '@agentskit/core'

export interface OpenAICompatibleEmbedderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json() as { data: Array<{ id: string }> }
  return data.data
    .map(m => m.id)
    .filter(id => id.includes('embed'))
    .sort()
}

async function buildModelError(
  provider: string,
  baseUrl: string,
  apiKey: string,
  originalError: string,
): Promise<Error> {
  try {
    const models = await fetchAvailableModels(baseUrl, apiKey)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return new Error(
      `${provider} embedding failed: ${originalError}. Available embedding models: ${list}`,
    )
  } catch (fetchError) {
    return new Error(
      `${provider} embedding failed: ${originalError}. Could not fetch available models: ${(fetchError as Error).message}`,
    )
  }
}

export function createOpenAICompatibleEmbedder(provider: string, defaultBaseUrl: string) {
  return function embedder(config: OpenAICompatibleEmbedderConfig): EmbedFn {
    if (!config.model) {
      throw new Error(`Model is required for ${provider}. Pass { model: "<model-name>" }.`)
    }
    const { apiKey, model, baseUrl = defaultBaseUrl } = config

    return async (text: string): Promise<number[]> => {
      const response = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, input: text }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as { error?: { message?: string } }
        const message = errorBody.error?.message ?? `HTTP ${response.status}`
        throw await buildModelError(provider, baseUrl, apiKey, message)
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> }
      return data.data[0].embedding
    }
  }
}
```

- [ ] **Step 4: Write the thin wrappers**

Create `packages/adapters/src/embedders/deepseek.ts`:

```typescript
import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

export interface DeepSeekEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

export const deepseekEmbedder = createOpenAICompatibleEmbedder('DeepSeek', 'https://api.deepseek.com')
```

Create `packages/adapters/src/embedders/grok.ts`:

```typescript
import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

export interface GrokEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

export const grokEmbedder = createOpenAICompatibleEmbedder('Grok', 'https://api.x.ai')
```

Create `packages/adapters/src/embedders/kimi.ts`:

```typescript
import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

export interface KimiEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

export const kimiEmbedder = createOpenAICompatibleEmbedder('Kimi', 'https://api.moonshot.ai')
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @agentskit/adapters test -- --run tests/embedders/openai-compatible.test.ts`
Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/adapters/src/embedders/openai-compatible.ts packages/adapters/src/embedders/deepseek.ts packages/adapters/src/embedders/grok.ts packages/adapters/src/embedders/kimi.ts packages/adapters/tests/embedders/openai-compatible.test.ts
git commit -m "feat(adapters): add openaiCompatibleEmbedder + deepseek, grok, kimi wrappers"
```

---

### Task 7: Barrel exports and wiring

**Files:**
- Create: `packages/adapters/src/embedders/index.ts`
- Modify: `packages/adapters/src/index.ts`

- [ ] **Step 1: Create embedders barrel export**

Create `packages/adapters/src/embedders/index.ts`:

```typescript
export { openaiEmbedder, type OpenAIEmbedderConfig } from './openai'
export { geminiEmbedder, type GeminiEmbedderConfig } from './gemini'
export { ollamaEmbedder, type OllamaEmbedderConfig } from './ollama'
export { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'
export { deepseekEmbedder, type DeepSeekEmbedderConfig } from './deepseek'
export { grokEmbedder, type GrokEmbedderConfig } from './grok'
export { kimiEmbedder, type KimiEmbedderConfig } from './kimi'
```

- [ ] **Step 2: Add embedder exports to main index**

In `packages/adapters/src/index.ts`, append:

```typescript
export {
  openaiEmbedder,
  geminiEmbedder,
  ollamaEmbedder,
  createOpenAICompatibleEmbedder,
  deepseekEmbedder,
  grokEmbedder,
  kimiEmbedder,
} from './embedders'
export type {
  OpenAIEmbedderConfig,
  GeminiEmbedderConfig,
  OllamaEmbedderConfig,
  OpenAICompatibleEmbedderConfig,
  DeepSeekEmbedderConfig,
  GrokEmbedderConfig,
  KimiEmbedderConfig,
} from './embedders'
```

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @agentskit/adapters build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/adapters/src/embedders/index.ts packages/adapters/src/index.ts
git commit -m "feat(adapters): export all embedders from main entry point"
```

---

### Task 8: Contract tests

**Files:**
- Create: `packages/adapters/tests/embedders/contract.test.ts`

- [ ] **Step 1: Write contract tests**

Create `packages/adapters/tests/embedders/contract.test.ts`:

```typescript
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
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
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
        server.use(mock())
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
```

- [ ] **Step 2: Run all embedder tests**

Run: `pnpm --filter @agentskit/adapters test`
Expected: All tests PASS (existing adapter tests + all embedder tests).

- [ ] **Step 3: Commit**

```bash
git add packages/adapters/tests/embedders/contract.test.ts
git commit -m "test(adapters): add contract tests for all embedders"
```

---

### Task 9: Final build and lint verification

- [ ] **Step 1: Build all packages**

Run: `pnpm build`
Expected: All packages build successfully.

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: All tests pass across all packages.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: No type errors.

- [ ] **Step 4: Commit any fixes if needed**

If any fixes were required, commit them:

```bash
git add -A
git commit -m "fix(adapters): resolve build/lint issues in embedders"
```
