import { ConfigError, ErrorCodes, RuntimeError } from '@agentskit/core'

export type SnapshotMode =
  | { kind: 'exact' }
  | { kind: 'normalized' }
  | { kind: 'similarity'; threshold: number; embed?: EmbedFn }

export type EmbedFn = (text: string) => Promise<number[]> | number[]

export interface SnapshotOptions {
  mode?: SnapshotMode
  /** Override via env var. Defaults to process.env.UPDATE_SNAPSHOTS === '1'. */
  update?: boolean
}

export interface SnapshotResult {
  matched: boolean
  reason: string
  similarity?: number
  expected?: string
  actual: string
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean)
}

export function jaccard(a: string, b: string): number {
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  if (setA.size === 0 && setB.size === 0) return 1
  let inter = 0
  for (const t of setA) if (setB.has(t)) inter++
  const union = setA.size + setB.size - inter
  return union === 0 ? 0 : inter / union
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!
    const bi = b[i]!
    dot += ai * bi
    magA += ai * ai
    magB += bi * bi
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

function assertUnitInterval(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${name} must be a finite number in [0, 1]`,
    })
  }
  return value
}

function assertEmbeddingVector(value: unknown, label: string): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: `${label}: embedding must be a non-empty number array`,
    })
  }
  for (let i = 0; i < value.length; i++) {
    const n = value[i]
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new RuntimeError({
        code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
        message: `${label}: embedding[${i}] must be a finite number`,
      })
    }
  }
  return value as number[]
}

export async function comparePrompt(
  actual: string,
  expected: string,
  mode: SnapshotMode = { kind: 'exact' },
): Promise<SnapshotResult> {
  if (mode.kind === 'exact') {
    return {
      matched: actual === expected,
      reason: actual === expected ? 'exact' : 'strings differ',
      expected,
      actual,
    }
  }
  if (mode.kind === 'normalized') {
    const a = normalize(actual)
    const e = normalize(expected)
    return {
      matched: a === e,
      reason: a === e ? 'normalized match' : 'normalized strings differ',
      expected,
      actual,
    }
  }

  const threshold = assertUnitInterval(mode.threshold, 'similarity threshold')

  let sim: number
  if (mode.embed) {
    const [rawA, rawE] = await Promise.all([mode.embed(actual), mode.embed(expected)])
    const va = assertEmbeddingVector(rawA, 'actual embedding')
    const ve = assertEmbeddingVector(rawE, 'expected embedding')
    if (va.length !== ve.length) {
      throw new RuntimeError({
        code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
        message: `Embedding dimension mismatch: actual=${va.length}, expected=${ve.length}`,
      })
    }
    sim = cosine(va, ve)
  } else {
    sim = jaccard(actual, expected)
  }

  if (!Number.isFinite(sim)) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: 'similarity computation produced a non-finite value',
    })
  }

  return {
    matched: sim >= threshold,
    reason:
      sim >= threshold
        ? `similarity ${sim.toFixed(3)} ≥ ${threshold}`
        : `similarity ${sim.toFixed(3)} < ${threshold}`,
    similarity: sim,
    expected,
    actual,
  }
}

/**
 * File-backed snapshot. If the snapshot file does not exist, or
 * `update` is true, the current `actual` is written and marked as
 * matched. Otherwise the stored snapshot is compared using `mode`.
 */
export async function matchPromptSnapshot(
  actual: string,
  path: string,
  options: SnapshotOptions = {},
): Promise<SnapshotResult> {
  const { readFile, writeFile, mkdir } = await import('node:fs/promises')
  const { dirname } = await import('node:path')
  const update =
    options.update ??
    (typeof process !== 'undefined' && process.env?.UPDATE_SNAPSHOTS === '1')

  let existing: string | null = null
  try {
    existing = await readFile(path, 'utf8')
  } catch {
    existing = null
  }

  if (existing === null || update) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, actual, 'utf8')
    return {
      matched: true,
      reason: existing === null ? 'snapshot created' : 'snapshot updated',
      actual,
      expected: existing ?? actual,
    }
  }

  return comparePrompt(actual, existing, options.mode ?? { kind: 'exact' })
}
