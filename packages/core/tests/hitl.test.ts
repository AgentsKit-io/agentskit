import { describe, expect, it } from 'vitest'
import {
  createApprovalGate,
  createInMemoryApprovalStore,
} from '../src/hitl'

describe('createInMemoryApprovalStore', () => {
  it('stores, reads, and patches approvals', async () => {
    const store = createInMemoryApprovalStore()
    await store.put({
      id: 'a',
      name: 'test',
      payload: { x: 1 },
      status: 'pending',
      createdAt: 'now',
    })
    const read = await store.get('a')
    expect(read?.payload).toEqual({ x: 1 })

    const patched = await store.patch('a', { status: 'approved' })
    expect(patched?.status).toBe('approved')
    expect(await store.get('a')).toMatchObject({ status: 'approved' })
  })

  it('get returns null for missing ids', async () => {
    const store = createInMemoryApprovalStore()
    expect(await store.get('missing')).toBeNull()
  })

  it('patch returns null for missing ids', async () => {
    const store = createInMemoryApprovalStore()
    expect(await store.patch('missing', { status: 'approved' })).toBeNull()
  })
})

describe('createApprovalGate', () => {
  it('request creates pending approval on first call', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    const r = await gate.request({ id: 'del-42', name: 'delete-user', payload: { userId: 42 } })
    expect(r.status).toBe('pending')
    expect(r.name).toBe('delete-user')
  })

  it('request is idempotent on the same id', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    const first = await gate.request({ id: 'x', name: 'test', payload: 1 })
    const second = await gate.request({ id: 'x', name: 'test', payload: 999 })
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.payload).toBe(1) // original payload kept
  })

  it('decide flips pending → approved with metadata', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await gate.request({ id: 'x', name: 'n', payload: 1 })
    const d = await gate.decide('x', 'approved', { approver: 'alice' })
    expect(d.status).toBe('approved')
    expect(d.decisionMetadata).toEqual({ approver: 'alice' })
    expect(d.decidedAt).toBeDefined()
  })

  it('decide throws when approval is missing', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await expect(gate.decide('missing', 'approved')).rejects.toThrow(/not found/)
  })

  it('cancel marks as cancelled', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await gate.request({ id: 'x', name: 'n', payload: 1 })
    const c = await gate.cancel('x')
    expect(c.status).toBe('cancelled')
  })

  it('await resolves once decision is made', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await gate.request({ id: 'x', name: 'n', payload: 1 })
    const waiter = gate.await('x', { pollMs: 50 })
    setTimeout(() => {
      void gate.decide('x', 'approved')
    }, 30)
    const result = await waiter
    expect(result.status).toBe('approved')
  })

  it('await returns immediately for already-decided approvals', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await gate.request({ id: 'x', name: 'n', payload: 1 })
    await gate.decide('x', 'rejected')
    const result = await gate.await('x')
    expect(result.status).toBe('rejected')
  })

  it('await times out', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await gate.request({ id: 'x', name: 'n', payload: 1 })
    await expect(gate.await('x', { timeoutMs: 50, pollMs: 50 })).rejects.toThrow(/timed out/)
  })

  it('await respects abort signal', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await gate.request({ id: 'x', name: 'n', payload: 1 })
    const controller = new AbortController()
    const waiter = gate.await('x', { pollMs: 50, signal: controller.signal })
    setTimeout(() => controller.abort(), 30)
    await expect(waiter).rejects.toThrow(/aborted/)
  })

  it('await throws when approval does not exist', async () => {
    const gate = createApprovalGate(createInMemoryApprovalStore())
    await expect(gate.await('ghost', { pollMs: 10, timeoutMs: 100 })).rejects.toThrow(/not found/)
  })
})
