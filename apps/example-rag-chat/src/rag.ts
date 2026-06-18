/**
 * RAG wiring for the "ask your docs" example.
 *
 * Three reused primitives, zero reinvention:
 *   1. embed   — a browser EmbedFn backed by @huggingface/transformers ONNX
 *                (Xenova/bge-small-en-v1.5). Runs fully on-device, no API key.
 *   2. store   — a tiny in-memory cosine VectorMemory (the only glue we write;
 *                createRAG requires a VectorMemory, and a browser corpus of a
 *                few docs needs nothing heavier than an in-process array).
 *   3. rag     — @agentskit/rag's createRAG, which owns chunking, ingest, and
 *                retrieval orchestration. It implements the Retriever contract,
 *                so it drops straight into useChat({ retriever: rag }).
 */
import type {
  EmbedFn,
  RetrievedDocument,
  VectorDocument,
  VectorMemory,
  VectorSearchOptions,
} from '@agentskit/core'
import { createRAG } from '@agentskit/rag'

// Sample corpus. Swap these four imports for your own docs (any string source:
// fetched markdown, CMS content, PDF text) — nothing else below changes.
import gettingStarted from './docs/getting-started.md?raw'
import pricing from './docs/pricing.md?raw'
import accessControl from './docs/access-control.md?raw'
import limitsAndFaq from './docs/limits-and-faq.md?raw'

const SAMPLE_DOCS = [
  { id: 'getting-started', source: 'getting-started.md', content: gettingStarted },
  { id: 'pricing', source: 'pricing.md', content: pricing },
  { id: 'access-control', source: 'access-control.md', content: accessControl },
  { id: 'limits-and-faq', source: 'limits-and-faq.md', content: limitsAndFaq },
]

// --- 1. Browser embedder (ONNX, on-device) --------------------------------

/** bge-small-en-v1.5 — 384-d, mean-pooled, L2-normalized. */
const EMBED_MODEL = 'Xenova/bge-small-en-v1.5'

// Minimal structural type for the slice of Transformers.js we touch, so the
// heavy dependency does not have to resolve at type-check time.
interface FeatureTensor {
  data: Float32Array | number[]
}
type FeatureExtractor = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<FeatureTensor>

let extractorPromise: Promise<FeatureExtractor> | null = null

async function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return (await pipeline(
        'feature-extraction',
        EMBED_MODEL,
      )) as unknown as FeatureExtractor
    })()
  }
  return extractorPromise
}

/** Embed one string → 384-d vector. The model runs in-browser via WASM/WebGPU. */
export const embed: EmbedFn = async (text: string): Promise<number[]> => {
  const extractor = await getExtractor()
  const tensor = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(tensor.data as ArrayLike<number>)
}

// --- 2. In-memory cosine VectorMemory -------------------------------------

function cosine(a: number[], b: number[]): number {
  // Embeddings are L2-normalized at embed time, so the dot product is cosine.
  let dot = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) dot += a[i] * b[i]
  return dot
}

/**
 * Smallest VectorMemory that satisfies the contract: keep docs in an array,
 * rank by cosine on search. Fine for a browser demo over a handful of docs.
 * For a real corpus, swap this for a hosted store (pgvector, pinecone, qdrant…)
 * from @agentskit/memory/vector — the Retriever contract is identical.
 */
function createInMemoryVectorStore(): VectorMemory {
  const docs: VectorDocument[] = []

  return {
    store(incoming: VectorDocument[]) {
      for (const d of incoming) docs.push(d)
    },
    search(embedding: number[], options?: VectorSearchOptions): RetrievedDocument[] {
      const topK = options?.topK ?? 4
      const threshold = options?.threshold ?? 0
      return docs
        .map((d): RetrievedDocument => ({
          id: d.id,
          content: d.content,
          score: cosine(embedding, d.embedding),
          metadata: d.metadata,
        }))
        .filter((d) => (d.score ?? 0) >= threshold)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, topK)
    },
  }
}

// --- 3. RAG retriever (chunking + ingest + retrieve, from the package) -----

/** Module-level singleton: build the index once, never on re-render. */
export const rag = createRAG({
  embed,
  store: createInMemoryVectorStore(),
  chunkSize: 512,
  chunkOverlap: 64,
  topK: 4,
})

let ingested: Promise<void> | null = null

/**
 * Embed and index the sample corpus. Idempotent: repeated calls share the same
 * promise, so React StrictMode's double-invoke does not double-ingest.
 */
export function ingestSampleDocs(): Promise<void> {
  if (!ingested) ingested = rag.ingest(SAMPLE_DOCS)
  return ingested
}
