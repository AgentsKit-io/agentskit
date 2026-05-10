import { describe, expect, it } from 'vitest'
import { forgetSubject, makeForgettable } from '../src/forget'

describe('forgetSubject', () => {
  it('runs forgetSubject on every forgettable backend', async () => {
    const a = makeForgettable(
      { name: 'a' },
      {
        backend: 'pgvector',
        listIds: async () => ['1', '2'],
        deleteIds: async () => {},
      },
    )
    const b = makeForgettable(
      { name: 'b' },
      {
        backend: 'pinecone',
        listIds: async () => ['9'],
        deleteIds: async () => {},
      },
    )
    const result = await forgetSubject([a, b, { unrelated: true }], 'subj-42')
    expect(result.subjectId).toBe('subj-42')
    expect(result.totalDeleted).toBe(3)
    expect(result.reports.map(r => r.backend)).toEqual(['pgvector', 'pinecone'])
    expect(result.evidenceHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('records failures when deleteIds throws', async () => {
    const m = makeForgettable(
      {},
      {
        backend: 'qdrant',
        listIds: async () => ['x', 'y'],
        deleteIds: async () => {
          throw new Error('cluster offline')
        },
      },
    )
    const result = await forgetSubject([m], 's1')
    expect(result.totalDeleted).toBe(0)
    expect(result.reports[0]!.failures).toHaveLength(2)
    expect(result.reports[0]!.failures![0]!.reason).toBe('cluster offline')
  })

  it('skips memories that do not implement forgetSubject', async () => {
    const result = await forgetSubject([{ load: () => [] }], 's1')
    expect(result.totalDeleted).toBe(0)
    expect(result.reports).toEqual([])
  })
})
