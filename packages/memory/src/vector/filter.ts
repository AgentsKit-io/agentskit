import type {
  VectorFilter,
  VectorFilterCompound,
  VectorFilterOperator,
  VectorFilterPredicate,
  VectorFilterPrimitive,
} from '@agentskit/core'

function isPrimitive(value: unknown): value is VectorFilterPrimitive {
  const t = typeof value
  return value === null || t === 'string' || t === 'number' || t === 'boolean'
}

function evalOperator(actual: unknown, op: VectorFilterOperator): boolean {
  if ('$eq' in op) return actual === op.$eq
  if ('$ne' in op) return actual !== op.$ne
  if ('$in' in op) return op.$in.includes(actual as VectorFilterPrimitive)
  if ('$nin' in op) return !op.$nin.includes(actual as VectorFilterPrimitive)
  if ('$gt' in op) return (actual as number | string) > op.$gt
  if ('$gte' in op) return (actual as number | string) >= op.$gte
  if ('$lt' in op) return (actual as number | string) < op.$lt
  if ('$lte' in op) return (actual as number | string) <= op.$lte
  if ('$exists' in op) return (actual !== undefined) === op.$exists
  return false
}

function evalPredicate(actual: unknown, predicate: VectorFilterPredicate): boolean {
  if (isPrimitive(predicate)) return actual === predicate
  return evalOperator(actual, predicate)
}

/**
 * Evaluate a `VectorFilter` against a metadata record. Used by in-memory /
 * file-backed vector stores. Backends with native filter languages (pgvector,
 * Pinecone, Qdrant, etc.) translate the filter to their own form instead.
 */
export function matchesFilter(metadata: Record<string, unknown> | undefined, filter: VectorFilter | undefined): boolean {
  if (!filter) return true
  const meta = metadata ?? {}

  const compound = filter as VectorFilterCompound
  if (compound.$and) return compound.$and.every(f => matchesFilter(meta, f))
  if (compound.$or) return compound.$or.some(f => matchesFilter(meta, f))

  for (const [field, predicate] of Object.entries(filter)) {
    if (field.startsWith('$')) continue
    if (!evalPredicate(meta[field], predicate as VectorFilterPredicate)) return false
  }
  return true
}
