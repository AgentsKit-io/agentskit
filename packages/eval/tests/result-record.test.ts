import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { createResultRecord, serializeResultRecord, verifyResultRecord, precisionRecall } from '../src/result-record'
import type { ResultRecordInput } from '../src/result-record'

const input = (): ResultRecordInput => ({
  suiteId: 'baseline', caseSetDigest: 'a'.repeat(64),
  subject: { revision: 'revision-1', digest: 'b'.repeat(64) }, runnerVersion: '1',
  metrics: { measured: 2, unavailable: 1, invalid: 0, units: [{ tp: 3, fp: 1, fn: 2, ...precisionRecall({ tp: 3, fp: 1, fn: 2 }) }] },
})

describe('result records', () => {
  it('hashes canonical UTF-8 content and produces byte-identical reruns', () => {
    const record = createResultRecord(input())
    const { digest, ...content } = record
    const json = serializeResultRecord({ ...content, digest })
    expect(digest).toBe(createHash('sha256').update(json.replace(/,"digest":"[a-f0-9]{64}"/, '')).digest('hex'))
    expect(serializeResultRecord(createResultRecord(input()))).toBe(json)
    expect(createResultRecord({ ...input(), metrics: { invalid: 0, unavailable: 1, units: input().metrics.units!, measured: 2 } }).digest).toBe(digest)
    expect(verifyResultRecord(JSON.parse(json))).toBe(true)
    expect(createResultRecord(record)).toEqual(record)
  })

  it('excludes optional timestamps from the digest but preserves them in serialization', () => {
    const record = createResultRecord({ ...input(), timestamp: '2026-01-01T00:00:00Z' })
    expect(record.digest).toBe(createResultRecord(input()).digest)
    expect(serializeResultRecord(record)).toContain(record.timestamp)
    expect(verifyResultRecord({ ...record, timestamp: 'later' })).toBe(true)
    expect(verifyResultRecord({ ...record, timestamp: 1 })).toBe(false)
  })

  it('detaches caller metrics and detects every content/provenance change', () => {
    const source = input()
    const record = createResultRecord(source)
    source.metrics.measured = 99
    source.subject.revision = 'changed'
    expect(record.metrics.measured).toBe(2)
    expect(verifyResultRecord(record)).toBe(true)
    for (const change of [{ suiteId: 'other' }, { caseSetDigest: 'c'.repeat(64) }, { subject: source.subject }, { runnerVersion: '2' }, { metrics: source.metrics }, { digest: '0'.repeat(64) }, { extra: true }]) {
      expect(verifyResultRecord({ ...record, ...change })).toBe(false)
    }
  })

  it('rejects malformed provenance and metrics without throwing during verification', () => {
    for (const value of [null, [], {}, { ...input(), suiteId: '' }, { ...input(), caseSetDigest: 'bad' }, { ...input(), subject: null }, { ...input(), metrics: [] }]) expect(verifyResultRecord(value)).toBe(false)
    expect(() => createResultRecord({ ...input(), metrics: { value: Number.NaN } })).toThrow()
    const cycle: ResultRecordInput['metrics'] = {}; cycle.self = cycle
    expect(() => createResultRecord({ ...input(), metrics: cycle })).toThrow()
  })
})

describe('precisionRecall', () => {
  it('computes ratios and defines empty denominators', () => {
    expect(precisionRecall({ tp: 3, fp: 1, fn: 2 })).toEqual({ precision: 0.75, recall: 0.6 })
    expect(precisionRecall({ tp: 0, fp: 0, fn: 0 })).toEqual({ precision: 0, recall: 0 })
    for (const tp of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(() => precisionRecall({ tp, fp: 0, fn: 0 })).toThrow()
  })
})
