import type { DataRegion, MaybePromise } from './common'
import type { Message } from './message'
import type { RetrievedDocument } from './retrieval'

/** Persistence contract for loading, saving, and clearing chat messages. */
export interface ChatMemory {
  /** Data-residency region for this memory backend, when known. */
  region?: DataRegion
  load: (options?: MemoryOperationOptions) => MaybePromise<Message[]>
  save: (messages: Message[], options?: MemoryOperationOptions) => MaybePromise<void>
  clear?: (options?: MemoryOperationOptions) => MaybePromise<void>
}

export interface MemoryOperationOptions {
  signal?: AbortSignal
}

/** Embedded content record stored by a vector-memory backend. */
export interface VectorDocument {
  id: string
  content: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

/**
 * Normalized metadata-filter shape (v1). Every vector backend translates
 * this into its own native filter language; callers stay portable.
 *
 * - Object form is field → predicate (implicit AND across fields).
 * - Predicate is either a primitive (shorthand for `{ $eq: ... }`) or one
 *   of the operator objects below.
 * - `$and` / `$or` compose nested filters.
 *
 * Example:
 *   { tags: { $in: ['docs', 'rag'] }, version: { $gte: 2 } }
 *   { $or: [{ author: 'alice' }, { author: 'bob' }] }
 */
export type VectorFilterPrimitive = string | number | boolean | null

/** Comparison operators supported by portable vector metadata filters. */
export type VectorFilterOperator =
  | { $eq: VectorFilterPrimitive }
  | { $ne: VectorFilterPrimitive }
  | { $in: VectorFilterPrimitive[] }
  | { $nin: VectorFilterPrimitive[] }
  | { $gt: number | string }
  | { $gte: number | string }
  | { $lt: number | string }
  | { $lte: number | string }
  | { $exists: boolean }

/** Primitive equality shorthand or an explicit metadata filter operator. */
export type VectorFilterPredicate = VectorFilterPrimitive | VectorFilterOperator

/** Boolean combination of nested vector metadata filters. */
export interface VectorFilterCompound {
  $and?: VectorFilter[]
  $or?: VectorFilter[]
}

/** Portable metadata filter accepted by vector-memory search. */
export type VectorFilter =
  | VectorFilterCompound
  | { [field: string]: VectorFilterPredicate }

/** Result limit, similarity threshold, and metadata filter for vector search. */
export interface VectorSearchOptions {
  topK?: number
  threshold?: number
  /** Metadata filter applied to candidates before / during similarity search. */
  filter?: VectorFilter
}

/** Contract for storing, searching, and optionally deleting embedded documents. */
export interface VectorMemory {
  /** Data-residency region for this vector backend, when known. */
  region?: DataRegion
  store: (docs: VectorDocument[]) => MaybePromise<void>
  search: (
    embedding: number[],
    options?: VectorSearchOptions,
  ) => MaybePromise<RetrievedDocument[]>
  delete?: (ids: string[]) => MaybePromise<void>
}

/** Convert text into its numeric embedding vector.
 * @param text Content to embed.
 * @returns The text embedding as an array of numbers.
 */
export type EmbedFn = (text: string) => Promise<number[]>
