/**
 * Shared helpers for embedder adapters.
 */

import { AdapterError, ErrorCodes } from '@agentskit/core'
import { NetError, readJson } from '@agentskit/net'

export async function throwIfNotOk(
  response: Response,
  label: string,
  _url: string,
): Promise<void> {
  if (response.ok) return
  void response.body?.cancel().catch(() => {})
  throw embeddingError(label, `HTTP ${response.status}`)
}

export function embeddingError(
  label: string,
  detail: string,
  cause?: unknown,
): AdapterError {
  return new AdapterError({
    code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
    message: `${label} embedding failed: ${detail}`,
    cause,
  })
}

export async function readEmbeddingJson<T>(
  response: Response,
  label: string,
  maxBytes: number,
): Promise<T> {
  try {
    return await readJson<T>(response, { maxBytes })
  } catch (cause) {
    if (!(cause instanceof NetError)) throw cause
    throw embeddingError(label, cause.message, cause)
  }
}

/**
 * Validate a 2xx embedding payload: finite non-empty number[].
 * Throws AdapterError (AgentsKitError) — never returns undefined.
 */
export function requireEmbeddingVector(
  value: unknown,
  label: string,
): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: `${label} returned an empty or missing embedding vector`,
      hint: 'The provider responded 2xx but the embedding payload was empty or malformed.',
    })
  }
  const vector: number[] = []
  for (let i = 0; i < value.length; i++) {
    const n = value[i]
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new AdapterError({
        code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
        message: `${label} returned a non-finite embedding value at index ${i}`,
        hint: 'Embedding vectors must be finite numbers only.',
      })
    }
    vector.push(n)
  }
  return vector
}
