import type { MaybePromise } from './common'
import type { Message } from './message'
import type { RetrievedDocument } from './retrieval'

export interface ChatMemory {
  load: () => MaybePromise<Message[]>
  save: (messages: Message[]) => MaybePromise<void>
  clear?: () => MaybePromise<void>
}

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

export type VectorFilterPredicate = VectorFilterPrimitive | VectorFilterOperator

export interface VectorFilterCompound {
  $and?: VectorFilter[]
  $or?: VectorFilter[]
}

export type VectorFilter =
  | VectorFilterCompound
  | { [field: string]: VectorFilterPredicate }

export interface VectorSearchOptions {
  topK?: number
  threshold?: number
  /** Metadata filter applied to candidates before / during similarity search. */
  filter?: VectorFilter
}

export interface VectorMemory {
  store: (docs: VectorDocument[]) => MaybePromise<void>
  search: (
    embedding: number[],
    options?: VectorSearchOptions,
  ) => MaybePromise<RetrievedDocument[]>
  delete?: (ids: string[]) => MaybePromise<void>
}

export type EmbedFn = (text: string) => Promise<number[]>
