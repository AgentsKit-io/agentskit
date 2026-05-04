import { describe, expect, it } from 'vitest'
import {
  appendPiiAuditEvents,
  createInMemoryAuditStore,
  createSignedAuditLog,
  type AuditEntry,
} from '../src/audit-log'

describe('createSignedAuditLog', () => {
  it('assigns monotonic seq and chain hashes', async () => {
    const log = createSignedAuditLog({
      secret: 'topsecret',
      store: createInMemoryAuditStore(),
      now: () => new Date(0),
    })
    const a = await log.append({ actor: 'alice', action: 'login', payload: { ip: '1.2.3.4' } })
    const b = await log.append({ actor: 'alice', action: 'export', payload: { rows: 10 } })
    expect(a.seq).toBe(1)
    expect(b.seq).toBe(2)
    expect(a.prevHash).toBe('')
    expect(b.prevHash).not.toBe('')
    expect(a.signature).not.toEqual(b.signature)
  })

  it('verify passes on untampered log', async () => {
    const log = createSignedAuditLog({
      secret: 'k',
      store: createInMemoryAuditStore(),
    })
    await log.append({ actor: 'a', action: 'x', payload: 1 })
    await log.append({ actor: 'b', action: 'y', payload: 2 })
    const v = await log.verify()
    expect(v.ok).toBe(true)
    expect(v.entryCount).toBe(2)
  })

  it('verify flags broken chain on content tampering', async () => {
    const store = createInMemoryAuditStore()
    const log = createSignedAuditLog({ secret: 'k', store })
    await log.append({ actor: 'a', action: 'x', payload: 1 })
    await log.append({ actor: 'b', action: 'y', payload: 2 })
    // Tamper with entry 2 directly via the store.
    const entries = await store.list()
    ;(entries[1] as AuditEntry & { payload: unknown }).payload = 'TAMPERED'
    await store.clear?.()
    for (const e of entries) await store.append(e)

    const v = await log.verify()
    expect(v.ok).toBe(false)
    expect(v.brokenAt?.reason).toBe('signature')
  })

  it('verify flags broken chain on splicing', async () => {
    const store = createInMemoryAuditStore()
    const log = createSignedAuditLog({ secret: 'k', store })
    await log.append({ actor: 'a', action: 'x', payload: 1 })
    await log.append({ actor: 'b', action: 'y', payload: 2 })
    await log.append({ actor: 'c', action: 'z', payload: 3 })

    const entries = await store.list()
    await store.clear?.()
    // Drop entry 2.
    for (const e of [entries[0]!, entries[2]!]) await store.append(e)

    const v = await log.verify()
    expect(v.ok).toBe(false)
    expect(v.brokenAt?.reason).toBe('prev-hash')
  })

  it('verify ok for empty log', async () => {
    const log = createSignedAuditLog({ secret: 'k', store: createInMemoryAuditStore() })
    const v = await log.verify()
    expect(v.ok).toBe(true)
    expect(v.entryCount).toBe(0)
  })

  it('different secret detects tampering', async () => {
    const store = createInMemoryAuditStore()
    const log = createSignedAuditLog({ secret: 'k1', store })
    await log.append({ actor: 'a', action: 'x', payload: 1 })
    const log2 = createSignedAuditLog({ secret: 'k2', store })
    const v = await log2.verify()
    expect(v.ok).toBe(false)
    expect(v.brokenAt?.reason).toBe('signature')
  })

  it('list returns all entries', async () => {
    const log = createSignedAuditLog({ secret: 'k', store: createInMemoryAuditStore() })
    await log.append({ actor: 'a', action: 'x', payload: 1 })
    await log.append({ actor: 'b', action: 'y', payload: 2 })
    expect(await log.list()).toHaveLength(2)
  })

  it('appends PII audit events into the signed hash chain', async () => {
    const log = createSignedAuditLog({
      secret: 'k',
      store: createInMemoryAuditStore(),
      now: () => new Date(0),
    })
    const entries = await appendPiiAuditEvents(log, {
      actor: 'redactor',
      action: 'pii:redact',
      subjectId: 'case-1',
      hits: [{ rule: 'email', count: 1, matches: [{ offset: 9, length: 11 }] }],
    })
    expect(entries[0]?.action).toBe('pii:redact')
    expect(entries[0]?.payload).toEqual({
      subjectId: 'case-1',
      rule: 'email',
      count: 1,
      matches: [{ offset: 9, length: 11 }],
    })
    expect((await log.verify()).ok).toBe(true)
  })
})

describe('createInMemoryAuditStore', () => {
  it('last returns null when empty, then latest entry', async () => {
    const s = createInMemoryAuditStore()
    expect(await s.last()).toBeNull()
    await s.append({
      seq: 1,
      timestamp: 'x',
      actor: 'a',
      action: 'x',
      payload: 1,
      prevHash: '',
      signature: 'sig',
    })
    expect((await s.last())?.seq).toBe(1)
  })

  it('clear empties the store', async () => {
    const s = createInMemoryAuditStore()
    await s.append({
      seq: 1,
      timestamp: 'x',
      actor: 'a',
      action: 'x',
      payload: 1,
      prevHash: '',
      signature: 'sig',
    })
    await s.clear?.()
    expect(await s.list()).toHaveLength(0)
  })
})
