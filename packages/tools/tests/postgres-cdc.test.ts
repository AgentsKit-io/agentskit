import { describe, expect, it, vi } from 'vitest'
import {
  createCdcStream,
  postgresCdc,
  postgresCdcAdvance,
  postgresCdcCreateSlot,
  postgresCdcDropSlot,
  postgresCdcPeek,
  postgresCdcStatus,
  type CdcAdminClient,
  type CdcChangeEvent,
  type CdcStreamClient,
} from '../src/integrations/postgres-cdc'

const stubCtx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }

interface QueuedReply {
  rows: Array<Record<string, unknown>>
  rowCount?: number
  error?: Error
}

function makeAdmin(replies: QueuedReply[] = []): { admin: CdcAdminClient; calls: Array<{ sql: string; params: unknown[] }> } {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const queue = [...replies]
  const admin: CdcAdminClient = {
    execute: vi.fn(async (sql, params) => {
      calls.push({ sql, params })
      const next = queue.shift()
      if (!next) return { rows: [], rowCount: 0 }
      if (next.error) throw next.error
      return { rows: next.rows, rowCount: next.rowCount ?? next.rows.length }
    }),
  }
  return { admin, calls }
}

describe('slot name validation', () => {
  it('rejects invalid identifiers at construction', () => {
    const { admin } = makeAdmin()
    expect(() => postgresCdcStatus({ admin, slotName: 'has spaces' })).toThrow(/slotName must match/)
    expect(() => postgresCdcStatus({ admin, slotName: 'drop-slot;--' })).toThrow(/slotName must match/)
  })

  it('rejects when admin client missing', () => {
    expect(() => postgresCdcStatus({ slotName: 'agent_slot' })).toThrow(/admin is required/)
  })
})

describe('postgresCdcStatus', () => {
  it('returns exists:false when slot is missing', async () => {
    const { admin, calls } = makeAdmin([{ rows: [] }])
    const tool = postgresCdcStatus({ admin, slotName: 'agent_slot' })
    const result = (await tool.execute!({}, stubCtx)) as { exists: boolean; slotName: string }
    expect(result).toEqual({ exists: false, slotName: 'agent_slot' })
    expect(calls[0].params).toEqual(['agent_slot'])
  })

  it('maps slot row to CdcSlotStatus shape', async () => {
    const { admin } = makeAdmin([
      {
        rows: [
          {
            slot_name: 'agent_slot',
            plugin: 'pgoutput',
            database: 'app',
            active: true,
            restart_lsn: '0/16B6360',
            confirmed_flush_lsn: '0/16B6400',
            wal_lag_bytes: 1024n,
          },
        ],
      },
    ])
    const tool = postgresCdcStatus({ admin, slotName: 'agent_slot' })
    const result = (await tool.execute!({}, stubCtx)) as {
      exists: boolean
      walLagBytes: number
      restartLsn: string
    }
    expect(result.exists).toBe(true)
    expect(result.walLagBytes).toBe(1024)
    expect(result.restartLsn).toBe('0/16B6360')
  })
})

describe('postgresCdcCreateSlot', () => {
  it('creates with default pgoutput plugin', async () => {
    const { admin, calls } = makeAdmin([{ rows: [{ info: 'ok' }] }])
    const tool = postgresCdcCreateSlot({ admin, slotName: 'agent_slot' })
    const result = (await tool.execute!({}, stubCtx)) as { created: boolean; plugin: string }
    expect(result).toMatchObject({ created: true, plugin: 'pgoutput' })
    expect(calls[0].params).toEqual(['agent_slot', 'pgoutput'])
  })

  it('treats "already exists" as not-created, no throw', async () => {
    const { admin } = makeAdmin([{ rows: [], error: new Error('replication slot "x" already exists') }])
    const tool = postgresCdcCreateSlot({ admin, slotName: 'agent_slot', plugin: 'wal2json' })
    const result = (await tool.execute!({}, stubCtx)) as { created: boolean; reason: string }
    expect(result).toMatchObject({ created: false, reason: 'exists' })
  })

  it('wraps unexpected errors as ToolError', async () => {
    const { admin } = makeAdmin([{ rows: [], error: new Error('permission denied for function pg_create_logical_replication_slot') }])
    const tool = postgresCdcCreateSlot({ admin, slotName: 'agent_slot' })
    await expect(tool.execute!({}, stubCtx)).rejects.toThrow(/permission denied/)
  })

  it('sets requiresConfirmation: true', () => {
    const { admin } = makeAdmin()
    expect(postgresCdcCreateSlot({ admin, slotName: 'agent_slot' }).requiresConfirmation).toBe(true)
  })
})

describe('postgresCdcDropSlot', () => {
  it('reports missing as not-dropped', async () => {
    const { admin } = makeAdmin([{ rows: [], error: new Error('replication slot "x" does not exist') }])
    const tool = postgresCdcDropSlot({ admin, slotName: 'agent_slot' })
    const result = (await tool.execute!({}, stubCtx)) as { dropped: boolean; reason: string }
    expect(result).toMatchObject({ dropped: false, reason: 'missing' })
  })

  it('drops successfully and is destructive', async () => {
    const { admin } = makeAdmin([{ rows: [] }])
    const tool = postgresCdcDropSlot({ admin, slotName: 'agent_slot' })
    expect(tool.requiresConfirmation).toBe(true)
    const result = await tool.execute!({}, stubCtx)
    expect(result).toMatchObject({ dropped: true })
  })
})

describe('postgresCdcAdvance', () => {
  it('forwards target LSN', async () => {
    const { admin, calls } = makeAdmin([{ rows: [{ info: 'ok' }] }])
    const tool = postgresCdcAdvance({ admin, slotName: 'agent_slot' })
    const result = (await tool.execute!({ lsn: '0/16B6500' }, stubCtx)) as { targetLsn: string }
    expect(result.targetLsn).toBe('0/16B6500')
    expect(calls[0].params).toEqual(['agent_slot', '0/16B6500'])
  })

  it('rejects malformed LSN before reaching the database', async () => {
    const { admin, calls } = makeAdmin()
    const tool = postgresCdcAdvance({ admin, slotName: 'agent_slot' })
    await expect(tool.execute!({ lsn: "'; DROP TABLE x" }, stubCtx)).rejects.toThrow(/lsn must look like/)
    expect(calls).toHaveLength(0)
  })
})

describe('postgresCdcPeek', () => {
  it('caps requested limit at maxPeek', async () => {
    const { admin, calls } = makeAdmin([{ rows: [] }])
    const tool = postgresCdcPeek({ admin, slotName: 'agent_slot', maxPeek: 10 })
    await tool.execute!({ limit: 1000 }, stubCtx)
    expect(calls[0].params).toEqual(['agent_slot', null, 10])
  })

  it('returns mapped changes + truncated flag', async () => {
    const { admin } = makeAdmin([
      {
        rows: [
          { lsn: '0/1', xid: '500', data: 'BEGIN' },
          { lsn: '0/2', xid: '500', data: 'INSERT...' },
        ],
      },
    ])
    const tool = postgresCdcPeek({ admin, slotName: 'agent_slot', maxPeek: 2 })
    const result = (await tool.execute!({ limit: 2 }, stubCtx)) as {
      count: number
      truncated: boolean
      changes: Array<{ lsn: string }>
    }
    expect(result.count).toBe(2)
    expect(result.truncated).toBe(true)
    expect(result.changes[0].lsn).toBe('0/1')
  })

  it('forwards upto_lsn when provided', async () => {
    const { admin, calls } = makeAdmin([{ rows: [] }])
    const tool = postgresCdcPeek({ admin, slotName: 'agent_slot' })
    await tool.execute!({ upto_lsn: '0/16B6500' }, stubCtx)
    expect(calls[0].params[1]).toBe('0/16B6500')
  })

  it('rejects malformed upto_lsn before reaching the database', async () => {
    const { admin, calls } = makeAdmin()
    const tool = postgresCdcPeek({ admin, slotName: 'agent_slot' })
    await expect(tool.execute!({ upto_lsn: 'not-an-lsn' }, stubCtx)).rejects.toThrow(/upto_lsn must look like/)
    expect(calls).toHaveLength(0)
  })
})

describe('postgresCdc()', () => {
  it('returns the five primitives in order', () => {
    const { admin } = makeAdmin()
    const tools = postgresCdc({ admin, slotName: 'agent_slot' })
    expect(tools.map(t => t.name)).toEqual([
      'postgres_cdc_status',
      'postgres_cdc_create_slot',
      'postgres_cdc_drop_slot',
      'postgres_cdc_advance',
      'postgres_cdc_peek',
    ])
  })
})

describe('createCdcStream', () => {
  it('throws when stream client missing', () => {
    expect(() => createCdcStream({ slotName: 'agent_slot' })).toThrow(/stream is required/)
  })

  it('forwards options to the injected stream client', async () => {
    const events: CdcChangeEvent[] = [
      { op: 'insert', schema: 'public', table: 'users', after: { id: 1 } },
      { op: 'update', schema: 'public', table: 'users', before: { id: 1 }, after: { id: 1, name: 'x' } },
    ]
    const seen: Array<{ startLsn?: string }> = []
    const stream: CdcStreamClient = {
      stream: vi.fn((opts) => {
        seen.push({ startLsn: opts?.startLsn })
        return (async function* () {
          for (const e of events) yield e
        })()
      }),
    }
    const out: CdcChangeEvent[] = []
    for await (const event of createCdcStream({ slotName: 'agent_slot', stream }, { startLsn: '0/1' })) {
      out.push(event)
    }
    expect(out).toEqual(events)
    expect(seen[0]).toEqual({ startLsn: '0/1' })
  })
})
