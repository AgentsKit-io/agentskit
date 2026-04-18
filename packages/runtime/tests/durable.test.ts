import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createDurableRunner,
  createFileStepLog,
  createInMemoryStepLog,
} from '../src/durable'

describe('createInMemoryStepLog', () => {
  it('appends, reads, lists, and clears', async () => {
    const store = createInMemoryStepLog()
    await store.append({
      runId: 'r',
      stepId: 's',
      name: 's',
      status: 'success',
      result: 1,
      startedAt: 'a',
      endedAt: 'b',
      attempt: 1,
    })
    expect((await store.get('r', 's'))?.result).toBe(1)
    expect(await store.list('r')).toHaveLength(1)
    expect(await store.get('other', 's')).toBeNull()
    await store.clear?.('r')
    expect(await store.list('r')).toHaveLength(0)
  })
})

describe('createDurableRunner', () => {
  it('executes a step and records success', async () => {
    const runner = createDurableRunner({ store: createInMemoryStepLog(), runId: 'r1' })
    const result = await runner.step('add', async () => 1 + 1)
    expect(result).toBe(2)
    const history = await runner.history()
    expect(history).toHaveLength(1)
    expect(history[0]!.status).toBe('success')
  })

  it('replays recorded successes without running fn again', async () => {
    const store = createInMemoryStepLog()
    const r1 = createDurableRunner({ store, runId: 'r1' })
    await r1.step('x', async () => 42)

    const fn = vi.fn(async () => 99)
    const r2 = createDurableRunner({ store, runId: 'r1' })
    const replayed = await r2.step('x', fn)
    expect(replayed).toBe(42)
    expect(fn).not.toHaveBeenCalled()
  })

  it('emits step:replay events on cache hits', async () => {
    const store = createInMemoryStepLog()
    await createDurableRunner({ store, runId: 'r' }).step('x', async () => 1)
    const events: string[] = []
    const runner = createDurableRunner({
      store,
      runId: 'r',
      onEvent: e => events.push(e.type),
    })
    await runner.step('x', async () => 999)
    expect(events).toEqual(['step:replay'])
  })

  it('retries up to maxAttempts', async () => {
    const fn = vi.fn(async () => {
      throw new Error('transient')
    })
    const runner = createDurableRunner({
      store: createInMemoryStepLog(),
      runId: 'r',
      maxAttempts: 3,
      retryDelayMs: 0,
    })
    await expect(runner.step('x', fn)).rejects.toThrow(/transient/)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('retry succeeds within budget', async () => {
    let calls = 0
    const runner = createDurableRunner({
      store: createInMemoryStepLog(),
      runId: 'r',
      maxAttempts: 3,
    })
    const result = await runner.step('x', async () => {
      calls++
      if (calls < 2) throw new Error('flaky')
      return 'ok'
    })
    expect(result).toBe('ok')
  })

  it('rethrows on previously failed step', async () => {
    const store = createInMemoryStepLog()
    const r1 = createDurableRunner({ store, runId: 'r' })
    await expect(r1.step('x', async () => {
      throw new Error('boom')
    })).rejects.toThrow(/boom/)
    const r2 = createDurableRunner({ store, runId: 'r' })
    await expect(r2.step('x', async () => 'never runs')).rejects.toThrow(/previously failed/)
  })

  it('reset clears the run log', async () => {
    const store = createInMemoryStepLog()
    const runner = createDurableRunner({ store, runId: 'r' })
    await runner.step('x', async () => 1)
    await runner.reset()
    expect(await runner.history()).toHaveLength(0)
  })

  it('onEvent fires start + success per attempt', async () => {
    const types: string[] = []
    const runner = createDurableRunner({
      store: createInMemoryStepLog(),
      runId: 'r',
      onEvent: e => types.push(e.type),
    })
    await runner.step('x', async () => 1)
    expect(types).toEqual(['step:start', 'step:success'])
  })
})

describe('createFileStepLog', () => {
  it('persists across runner instances', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-dur-'))
    try {
      const store = await createFileStepLog(join(dir, 'log.jsonl'))
      const r1 = createDurableRunner({ store, runId: 'r' })
      await r1.step('x', async () => 7)

      const store2 = await createFileStepLog(join(dir, 'log.jsonl'))
      const r2 = createDurableRunner({ store: store2, runId: 'r' })
      const fn = vi.fn(async () => 999)
      expect(await r2.step('x', fn)).toBe(7)
      expect(fn).not.toHaveBeenCalled()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('clear removes only the requested run', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-dur-'))
    try {
      const store = await createFileStepLog(join(dir, 'log.jsonl'))
      await createDurableRunner({ store, runId: 'a' }).step('x', async () => 1)
      await createDurableRunner({ store, runId: 'b' }).step('x', async () => 2)
      await store.clear?.('a')
      expect(await store.list('a')).toHaveLength(0)
      expect(await store.list('b')).toHaveLength(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
