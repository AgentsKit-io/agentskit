/**
 * Local ONNX embedding for the docs RAG index.
 *
 * Uses `@huggingface/transformers` (Transformers.js v4) feature-extraction with
 * `Xenova/bge-small-en-v1.5` (384-d). The pipeline runs the ONNX model fully
 * on-device — no network at query time, no API key — so it works in both the
 * build step (scripts/gen-ask-index.mjs) and a Node serverless route.
 *
 * Vectors are mean-pooled over tokens and L2-normalized, which is what BGE
 * expects for cosine similarity. We pass `{ pooling: 'mean', normalize: true }`
 * so the library does it, and re-normalize defensively in case a future model
 * variant returns un-normalized output.
 */
import type { EmbedFn } from '@agentskit/core'

/** Embedding dimensionality of Xenova/bge-small-en-v1.5. */
export const EMBED_DIM = 384

/** Model id (Transformers.js / ONNX) used for all docs embeddings. */
export const EMBED_MODEL = 'Xenova/bge-small-en-v1.5'

// Minimal structural types for the bits of Transformers.js we touch. The
// package ships its own types, but importing them eagerly would force the
// (heavy, optional) dependency to resolve at type-check time in every consumer.
interface FeatureTensor {
  data: Float32Array | number[]
  dims: number[]
  tolist: () => number[] | number[][] | number[][][]
}

type FeatureExtractor = (
  text: string | string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<FeatureTensor>

let extractorPromise: Promise<FeatureExtractor> | null = null

/**
 * Lazily build (and cache) the feature-extraction pipeline. The first call pays
 * the model-load cost; every later call reuses the same in-process singleton.
 */
async function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      const extractor = (await pipeline(
        'feature-extraction',
        EMBED_MODEL,
      )) as unknown as FeatureExtractor
      return extractor
    })()
  }
  return extractorPromise
}

function l2normalize(vec: number[]): number[] {
  let sumSq = 0
  for (const v of vec) sumSq += v * v
  const norm = Math.sqrt(sumSq)
  if (norm === 0) return vec
  return vec.map((v) => v / norm)
}

/**
 * Coerce a single-row (or single-batched) feature tensor into a flat number[].
 * With `pooling: 'mean'` the output is `[batch, hidden]`; for one input that is
 * `[1, 384]`. `.tolist()` returns nested arrays; `.data` is the flat buffer.
 */
function tensorToVector(tensor: FeatureTensor): number[] {
  const flat = Array.from(tensor.data as ArrayLike<number>)
  // A single mean-pooled row already has length === hidden size.
  return l2normalize(flat)
}

function tensorToMatrix(tensor: FeatureTensor, rows: number): number[][] {
  const flat = Array.from(tensor.data as ArrayLike<number>)
  const hidden = flat.length / rows
  const out: number[][] = []
  for (let r = 0; r < rows; r++) {
    out.push(l2normalize(flat.slice(r * hidden, (r + 1) * hidden)))
  }
  return out
}

/** Embed a single string → 384-d mean-pooled, L2-normalized vector. */
export const embed: EmbedFn = async (text: string): Promise<number[]> => {
  const extractor = await getExtractor()
  const tensor = await extractor(text, { pooling: 'mean', normalize: true })
  return tensorToVector(tensor)
}

/**
 * Embed a batch of strings in a single pipeline call. Returns one 384-d vector
 * per input, in order. Empty input → empty output (no model invocation).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const extractor = await getExtractor()
  const tensor = await extractor(texts, { pooling: 'mean', normalize: true })
  return tensorToMatrix(tensor, texts.length)
}
