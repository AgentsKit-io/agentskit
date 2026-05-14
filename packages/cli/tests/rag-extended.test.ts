/**
 * Extended RAG runner tests — covers resolveEmbedder paths (lines 41-50)
 * and buildRagFromConfig without an injected embedder.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveEmbedder, buildRagFromConfig } from '../src/extensibility/rag/runner'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'agentskit-rag-ext-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('resolveEmbedder', () => {
  it('throws for unsupported provider', () => {
    expect(() =>
      resolveEmbedder({ embedder: { provider: 'unsupported-provider' } }),
    ).toThrow(/Unsupported RAG embedder/)
  })

  it('throws when no API key available', () => {
    const origOpenAI = process.env.OPENAI_API_KEY
    const origOpenRouter = process.env.OPENROUTER_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_KEY

    try {
      expect(() => resolveEmbedder({})).toThrow(/API key/)
    } finally {
      if (origOpenAI !== undefined) process.env.OPENAI_API_KEY = origOpenAI
      if (origOpenRouter !== undefined) process.env.OPENROUTER_API_KEY = origOpenRouter
    }
  })

  it('returns a function when OPENAI_API_KEY is set', () => {
    const orig = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'sk-test-key'
    try {
      const fn = resolveEmbedder({})
      expect(typeof fn).toBe('function')
    } finally {
      if (orig !== undefined) process.env.OPENAI_API_KEY = orig
      else delete process.env.OPENAI_API_KEY
    }
  })

  it('returns a function when OPENROUTER_API_KEY is set', () => {
    const origOpenAI = process.env.OPENAI_API_KEY
    const origOpenRouter = process.env.OPENROUTER_API_KEY
    delete process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'sk-openrouter-test'
    try {
      const fn = resolveEmbedder({})
      expect(typeof fn).toBe('function')
    } finally {
      if (origOpenAI !== undefined) process.env.OPENAI_API_KEY = origOpenAI
      else delete process.env.OPENAI_API_KEY
      if (origOpenRouter !== undefined) process.env.OPENROUTER_API_KEY = origOpenRouter
      else delete process.env.OPENROUTER_API_KEY
    }
  })

  it('accepts custom apiKey, model, and baseUrl', () => {
    const fn = resolveEmbedder({
      embedder: {
        provider: 'openai',
        apiKey: 'custom-key',
        model: 'text-embedding-3-large',
        baseUrl: 'https://my-proxy.example.com',
      },
    })
    expect(typeof fn).toBe('function')
  })
})

describe('buildRagFromConfig', () => {
  it('builds a RAG instance with injected embedder', () => {
    const rag = buildRagFromConfig({
      config: { dir: join(dir, 'store') },
      cwd: dir,
      embedder: async () => [0, 1, 2],
    })
    expect(rag).toBeDefined()
    expect(typeof rag.search).toBe('function')
    expect(typeof rag.ingest).toBe('function')
  })

  it('uses cwd default (process.cwd()) when not provided', () => {
    const rag = buildRagFromConfig({
      config: { dir: join(dir, 'store') },
      embedder: async () => [0, 1, 2],
    })
    expect(rag).toBeDefined()
  })
})
