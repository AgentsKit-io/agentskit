import { describe, expect, it } from 'vitest'
import { forgetSubject, makeForgettable } from '../src/forget'
import { fileVectorMemory } from '../src/file-vector'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
    expect(result.incomplete).toBe(true)
    expect(result.skippedBackends).toEqual(['unknown'])
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

  it('reports memories that do not implement forgetSubject', async () => {
    const result = await forgetSubject([{ load: () => [] }], 's1')
    expect(result.totalDeleted).toBe(0)
    expect(result.reports).toEqual([])
    expect(result.incomplete).toBe(true)
    expect(result.skippedBackends).toEqual(['unknown'])
  })

  it('continues after one backend rejects and reports incomplete progress', async () => {
    let healthyCalled = false
    const failing = { __agentskitBackend: 'failed', forgetSubject: async () => { throw new Error('offline') } }
    const healthy = makeForgettable({}, {
      backend: 'healthy', listIds: async () => ['id-1'], deleteIds: async () => { healthyCalled = true },
    })
    const result = await forgetSubject([failing, healthy], 'subject')
    expect(healthyCalled).toBe(true)
    expect(result.incomplete).toBe(true)
    expect(result.reports).toHaveLength(2)
    expect(result.reports[0]?.failures?.[0]).toMatchObject({ id: '*', reason: 'offline' })
    expect(result.totalDeleted).toBe(1)
  })

  it('reports ID enumeration failure without claiming deletions', async () => {
    const memory = makeForgettable({}, {
      backend: 'enumeration', listIds: async () => { throw new Error('list failed') }, deleteIds: async () => {},
    })
    const result = await forgetSubject([memory], 'subject')
    expect(result.incomplete).toBe(true)
    expect(result.totalDeleted).toBe(0)
    expect(result.reports[0]?.failures?.[0]).toMatchObject({ id: '*', reason: 'list failed' })
  })

  it('continues after a failing backend and physically erases indexed subject rows from local Vectra', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agentskit-forget-vectra-'))
    try {
      const memory = fileVectorMemory({ path: directory })
      await memory.store([
        { id: 'subject-a-1', content: 'A one', embedding: [1, 0, 0], metadata: { subjectId: 'A' } },
        { id: 'subject-a-2', content: 'A two', embedding: [0, 1, 0], metadata: { subjectId: 'A' } },
        { id: 'subject-b-1', content: 'B one', embedding: [0, 0, 1], metadata: { subjectId: 'B' } },
      ])
      const failing = { __agentskitBackend: 'first', forgetSubject: async () => { throw new Error('offline') } }
      const { LocalIndex } = await import('vectra')
      const index = new LocalIndex(directory)
      const forgettable = makeForgettable(memory, {
        backend: 'vectra-local',
        listIds: async subjectId => (await index.listItems())
          .filter(item => item.metadata.subjectId === subjectId)
          .map(item => String(item.metadata._id ?? item.id)),
        deleteIds: async ids => { await memory.delete!(ids) },
      })

      const result = await forgetSubject([failing, forgettable], 'A')
      expect(result.incomplete).toBe(true)
      expect(result.totalDeleted).toBe(2)
      expect(result.reports[0]?.failures?.[0]).toMatchObject({ id: '*', reason: 'offline' })

      const reopened = fileVectorMemory({ path: directory })
      const nativeIndex = new LocalIndex(directory)
      const persisted = await nativeIndex.listItems()
      const ids = persisted.map(item => String(item.metadata._id ?? item.id))
      expect(ids).not.toContain('subject-a-1')
      expect(ids).not.toContain('subject-a-2')
      expect(ids).toContain('subject-b-1')
      expect((await reopened.search([0, 0, 1], { topK: 50 })).map(row => row.id)).toEqual(['subject-b-1'])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 30_000)
})
