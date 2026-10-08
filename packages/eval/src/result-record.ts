import { canonicalJson, sha256Hex } from '@agentskit/core/hash'

/** JSON data stored as benchmark metrics, including per-case or per-unit results. */
export type ResultMetric = null | boolean | number | string | ResultMetric[] | { [key: string]: ResultMetric }

/** Provenance and metrics whose canonical JSON determines a result digest. */
export interface ResultRecordInput {
  suiteId: string
  caseSetDigest: string
  subject: { revision: string; digest: string }
  runnerVersion: string
  timestamp?: string
  metrics: { [key: string]: ResultMetric }
}

/** Result envelope with a lowercase SHA-256 content digest; timestamp is excluded. */
export interface ResultRecord extends ResultRecordInput {
  digest: string
}

function validate(input: ResultRecordInput): void {
  for (const value of [input.suiteId, input.subject.revision, input.runnerVersion]) {
    if (typeof value !== 'string' || value.trim() === '') throw new TypeError('Result provenance requires non-empty strings')
  }
  for (const value of [input.caseSetDigest, input.subject.digest]) {
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new TypeError('Result provenance requires lowercase SHA-256 digests')
  }
  if (input.timestamp !== undefined && typeof input.timestamp !== 'string') throw new TypeError('Result timestamp must be a string')
  if (!input.metrics || typeof input.metrics !== 'object' || Array.isArray(input.metrics)) throw new TypeError('Result metrics must be an object')
}

/**
 * Snapshot provenance and metrics and hash their canonical JSON, excluding timestamp.
 * @param input - Suite, frozen case-set and subject identity, runner version, and JSON metrics.
 * @returns A detached result envelope with its SHA-256 digest.
 * @throws {TypeError} For malformed provenance or non-serializable metrics.
 * @example
 * createResultRecord({ suiteId: 'baseline', caseSetDigest, subject, runnerVersion: '1', metrics: { measured: 2 } })
 */
export function createResultRecord(input: ResultRecordInput): ResultRecord {
  validate(input)
  const { timestamp, digest: _digest, ...content } = input as ResultRecord
  const json = canonicalJson(content)
  return { ...JSON.parse(json) as Omit<ResultRecordInput, 'timestamp'>, ...(timestamp === undefined ? {} : { timestamp }), digest: sha256Hex(json) }
}

/**
 * Serialize the whole envelope as canonical JSON for storage or byte comparisons.
 * @param record - Result envelope to serialize.
 * @returns Canonical JSON text; includes timestamp when supplied.
 * @example
 * serializeResultRecord(record)
 */
export function serializeResultRecord(record: ResultRecord): string {
  return canonicalJson(record)
}

/**
 * Check provenance and recompute the digest; malformed or changed content returns false.
 * A timestamp change does not affect integrity. This checks content, not authenticity.
 * @param record - Untrusted parsed result envelope.
 * @returns Whether provenance and the content digest are valid.
 * @example
 * verifyResultRecord(JSON.parse(savedJson))
 */
export function verifyResultRecord(record: unknown): record is ResultRecord {
  try {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false
    const { digest, ...input } = record as ResultRecord
    return typeof digest === 'string' && createResultRecord(input).digest === digest
  } catch {
    return false
  }
}

/**
 * Calculate precision and recall from non-negative integer classification counts.
 * @param counts - True positives, false positives, and false negatives.
 * @returns Ratios in [0, 1]; a zero denominator yields zero.
 * @throws {TypeError} For negative, fractional, or unsafe counts.
 * @example
 * precisionRecall({ tp: 3, fp: 1, fn: 2 }) // { precision: 0.75, recall: 0.6 }
 */
export function precisionRecall(counts: { tp: number; fp: number; fn: number }): { precision: number; recall: number } {
  const { tp, fp, fn } = counts
  if ([tp, fp, fn].some((count) => !Number.isSafeInteger(count) || count < 0)) throw new TypeError('Classification counts must be non-negative safe integers')
  return { precision: tp / (tp + fp) || 0, recall: tp / (tp + fn) || 0 }
}
