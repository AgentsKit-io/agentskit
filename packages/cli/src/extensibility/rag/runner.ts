import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { glob } from 'node:fs/promises'
import { fileVectorMemory } from '@agentskit/memory'
import { createRAG } from '@agentskit/rag'
import type { RAG } from '@agentskit/rag'
import type { EmbedFn } from '@agentskit/core'
import { createOpenAiEmbedder } from './embedders'

export interface RagConfig {
  enabled?: boolean
  backend?: 'memory' | 'file'
  dir?: string
  sources?: string[]
  embedder?: {
    provider?: string
    model?: string
    apiKey?: string
    baseUrl?: string
  }
  chunkSize?: number
  topK?: number
}

export interface BuildRagOptions {
  config: RagConfig
  cwd?: string
  /** Override the embedder resolution (useful for tests). */
  embedder?: EmbedFn
}

export interface IndexResult {
  /** Number of input documents ingested. */
  documentCount: number
  /** Sources globbed + ingested (absolute paths). */
  sources: string[]
}

/** Resolve an `EmbedFn` from config. Currently only OpenAI-compatible. */
export function resolveEmbedder(config: RagConfig): EmbedFn {
  const embedder = config.embedder
  const provider = embedder?.provider ?? 'openai'
  if (provider !== 'openai') {
    throw new Error(`Unsupported RAG embedder provider: ${provider}. Only "openai" is built-in.`)
  }
  const apiKey = embedder?.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('RAG embedder needs an API key (config.rag.embedder.apiKey or OPENAI_API_KEY env).')
  }
  return createOpenAiEmbedder({
    apiKey,
    model: embedder?.model,
    baseUrl: embedder?.baseUrl,
  })
}

/**
 * Build a live `RAG` instance from a config. Wires the embedder + vector
 * store but does not ingest anything — call `indexSources` for that.
 */
export function buildRagFromConfig(options: BuildRagOptions): RAG {
  const cwd = options.cwd ?? process.cwd()
  const dir = resolve(cwd, options.config.dir ?? './.agentskit-rag')
  const store = fileVectorMemory({ path: `${dir}/store.json` })
  const embed = options.embedder ?? resolveEmbedder(options.config)
  return createRAG({
    embed,
    store,
    chunkSize: options.config.chunkSize,
    topK: options.config.topK,
  })
}

/**
 * Glob `config.sources` from `cwd`, read each file, and ingest through the
 * provided RAG. Returns a summary of what was indexed.
 */
export async function indexSources(rag: RAG, config: RagConfig, cwd?: string): Promise<IndexResult> {
  const root = cwd ?? process.cwd()
  const sources = config.sources ?? []
  const absolutePaths: string[] = []

  for (const pattern of sources) {
    for await (const match of glob(pattern, { cwd: root })) {
      absolutePaths.push(resolve(root, match))
    }
  }

  const documents = await Promise.all(
    absolutePaths.map(async (path) => ({
      id: path,
      content: await readFile(path, 'utf8'),
      source: path,
    })),
  )

  if (documents.length > 0) await rag.ingest(documents)

  return { documentCount: documents.length, sources: absolutePaths }
}
