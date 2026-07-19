import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentEvent } from '@agentskit/core'

interface Captured {
  createRun: Array<Record<string, unknown>>
  updateRun: Array<{ id: string; params: Record<string, unknown> }>
  order: string[]
  awaitPendingCalls: number
}

let captured: Captured

beforeEach(() => {
  captured = { createRun: [], updateRun: [], order: [], awaitPendingCalls: 0 }
  vi.doMock('langsmith', () => ({
    Client: class FakeClient {
      async createRun(p: Record<string, unknown>) {
        const id = String(p.id)
        captured.order.push(`create:${id}`)
        captured.createRun.push(p)
      }
      async updateRun(id: string, params: Record<string, unknown>) {
        captured.order.push(`update:${id}`)
        captured.updateRun.push({ id, params })
      }
      async awaitPendingTraceBatches() {
        captured.awaitPendingCalls += 1
      }
    },
  }))
})

afterEach(() => {
  vi.doUnmock('langsmith')
  vi.resetModules()
})

function defer(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const llmStart = (): AgentEvent => ({ type: 'llm:start', model: 'gpt', messageCount: 1 })
const llmEnd = (): AgentEvent => ({
  type: 'llm:end',
  content: 'hi',
  usage: { promptTokens: 1, completionTokens: 1 },
  durationMs: 5,
})

describe('langsmith observer', () => {
  it('exposes Observer + flush/shutdown', async () => {
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    expect(sink.name).toBe('langsmith')
    expect(typeof sink.on).toBe('function')
    expect(typeof sink.flush).toBe('function')
    expect(typeof sink.shutdown).toBe('function')
  })

  it('construction is pure — no SDK import until first span', async () => {
    let imported = false
    vi.doMock('langsmith', () => {
      imported = true
      return {
        Client: class {
          async createRun() {}
          async updateRun() {}
        },
      }
    })
    const { langsmith } = await import('../src/langsmith')
    langsmith({ apiKey: 'k' })
    expect(imported).toBe(false)
  })

  it('empty flush does not import SDK', async () => {
    let imported = false
    vi.doMock('langsmith', () => {
      imported = true
      return {
        Client: class {
          async createRun() {}
          async updateRun() {}
          async awaitPendingTraceBatches() {}
        },
      }
    })
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    await sink.flush()
    expect(imported).toBe(false)
  })

  it('updateRun awaits matching createRun (deferred)', async () => {
    vi.resetModules()
    const gate = defer()
    vi.doMock('langsmith', () => ({
      Client: class {
        async createRun(p: Record<string, unknown>) {
          captured.order.push(`create:${String(p.id)}`)
          captured.createRun.push(p)
          await gate.promise
        }
        async updateRun(id: string, params: Record<string, unknown>) {
          captured.order.push(`update:${id}`)
          captured.updateRun.push({ id, params })
        }
      },
    }))
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k', projectName: 'p' })
    sink.on(llmStart())
    sink.on(llmEnd())
    await Promise.resolve()
    expect(captured.updateRun.length).toBe(0)
    gate.resolve()
    await sink.flush()
    expect(captured.createRun.length).toBeGreaterThan(0)
    expect(captured.updateRun.length).toBeGreaterThan(0)
    const createIdx = captured.order.findIndex((x) => x.startsWith('create:'))
    const updateIdx = captured.order.findIndex((x) => x.startsWith('update:'))
    expect(createIdx).toBeGreaterThanOrEqual(0)
    expect(updateIdx).toBeGreaterThan(createIdx)
  })

  it('child create waits for parent create', async () => {
    const parentGate = defer()
    let parentId: string | null = null
    vi.resetModules()
    vi.doMock('langsmith', () => ({
      Client: class {
        async createRun(p: Record<string, unknown>) {
          const id = String(p.id)
          captured.order.push(`create:${id}`)
          captured.createRun.push(p)
          if (p.parent_run_id == null) {
            parentId = id
            await parentGate.promise
          }
        }
        async updateRun(id: string, params: Record<string, unknown>) {
          captured.order.push(`update:${id}`)
          captured.updateRun.push({ id, params })
        }
      },
    }))
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    sink.on({ type: 'agent:step', step: 1, action: 'a' })
    sink.on(llmStart())
    await Promise.resolve()
    await Promise.resolve()
    const childCreates = captured.createRun.filter((r) => r.parent_run_id != null)
    expect(childCreates.length).toBe(0)
    parentGate.resolve()
    await sink.flush()
    expect(captured.createRun.some((r) => r.parent_run_id != null)).toBe(true)
    expect(parentId).toBeTruthy()
  })

  it('create failure blocks update for that span without unhandledRejection', async () => {
    const unhandled: unknown[] = []
    const onUR = (r: unknown) => unhandled.push(r)
    process.on('unhandledRejection', onUR)
    try {
      vi.resetModules()
      vi.doMock('langsmith', () => ({
        Client: class {
          async createRun() {
            throw new Error('create boom')
          }
          async updateRun() {
            captured.updateRun.push({ id: 'x', params: {} })
          }
        },
      }))
      const { langsmith } = await import('../src/langsmith')
      const errors: unknown[] = []
      const sink = langsmith({
        apiKey: 'k',
        onError: (e) => {
          errors.push(e)
        },
      })
      sink.on(llmStart())
      sink.on(llmEnd())
      await sink.flush()
      expect(captured.updateRun.length).toBe(0)
      expect(errors.length).toBeGreaterThanOrEqual(1)
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUR)
    }
  })

  it('snapshots inputs; later mutation of args object is not reflected', async () => {
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    const args: Record<string, unknown> = { n: 1, nested: { v: 'orig' } }
    sink.on({ type: 'tool:start', name: 't', args })
    args.n = 999
    ;(args.nested as Record<string, unknown>).v = 'mutated'
    sink.on({ type: 'tool:end', name: 't', result: 'ok', durationMs: 1 })
    await sink.flush()
    expect(captured.createRun.length).toBeGreaterThan(0)
    const inputs = captured.createRun[0]!.inputs as Record<string, unknown>
    const serialized = JSON.stringify(inputs)
    expect(serialized).toContain('orig')
    expect(serialized).not.toContain('mutated')
    expect(serialized).not.toContain('999')
  })

  it('flush waits for awaitPendingTraceBatches after local pending', async () => {
    vi.resetModules()
    const sdkGate = defer()
    let sdkReached = false
    vi.doMock('langsmith', () => ({
      Client: class {
        async createRun(p: Record<string, unknown>) {
          captured.createRun.push(p)
        }
        async updateRun(id: string, params: Record<string, unknown>) {
          captured.updateRun.push({ id, params })
        }
        async awaitPendingTraceBatches() {
          sdkReached = true
          captured.awaitPendingCalls += 1
          await sdkGate.promise
        }
      },
    }))
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    sink.on(llmStart())
    sink.on(llmEnd())
    let flushDone = false
    const flushP = sink.flush().then(() => {
      flushDone = true
    })
    await vi.waitFor(() => expect(sdkReached).toBe(true))
    expect(flushDone).toBe(false)
    sdkGate.resolve()
    await flushP
    expect(flushDone).toBe(true)
    expect(captured.awaitPendingCalls).toBe(1)
  })

  it('isolates awaitPendingTraceBatches sync throw and async reject', async () => {
    for (const mode of ['sync', 'async'] as const) {
      vi.resetModules()
      captured = { createRun: [], updateRun: [], order: [], awaitPendingCalls: 0 }
      vi.doMock('langsmith', () => ({
        Client: class {
          async createRun(p: Record<string, unknown>) {
            captured.createRun.push(p)
          }
          async updateRun() {}
          awaitPendingTraceBatches() {
            captured.awaitPendingCalls += 1
            if (mode === 'sync') throw new Error('sdk queue sync boom')
            return Promise.reject(new Error('sdk queue async boom'))
          }
        },
      }))
      const { langsmith } = await import('../src/langsmith')
      const errors: unknown[] = []
      const sink = langsmith({
        apiKey: 'k',
        onError: (e) => {
          errors.push(e)
        },
      })
      sink.on(llmStart())
      await expect(sink.flush()).resolves.toBeUndefined()
      expect(captured.awaitPendingCalls).toBe(1)
      expect(errors.some((e) => String(e).includes('sdk queue'))).toBe(true)
    }
  })

  it('shutdown is idempotent; events after are ignored', async () => {
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    sink.on(llmStart())
    await Promise.all([sink.shutdown(), sink.shutdown()])
    const creates = captured.createRun.length
    sink.on(llmStart())
    sink.on(llmEnd())
    await sink.flush()
    expect(captured.createRun.length).toBe(creates)
  })

  it('missing SDK never throws from on/flush/shutdown', async () => {
    vi.resetModules()
    vi.doMock('langsmith', () => {
      throw new Error('not installed')
    })
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    expect(() => {
      sink.on(llmStart())
      sink.on(llmEnd())
    }).not.toThrow()
    await expect(sink.flush()).resolves.toBeUndefined()
    await expect(sink.shutdown()).resolves.toBeUndefined()
  })

  it('run-aborted ends open spans via tracker', async () => {
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    sink.on({ type: 'agent:step', step: 1, action: 'a' })
    sink.on(llmStart())
    sink.on({ type: 'run-aborted' })
    await sink.flush()
    expect(captured.updateRun.length).toBeGreaterThan(0)
  })

  it('passes attributes through to createRun.inputs', async () => {
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    sink.on(llmStart())
    await sink.flush()
    expect(captured.createRun.length).toBeGreaterThan(0)
    const first = captured.createRun[0]!
    expect(first.project_name).toBe('agentskit')
    expect(first.run_type).toBe('llm')
  })

  it('swallows client errors so the main loop is not interrupted', async () => {
    vi.resetModules()
    vi.doMock('langsmith', () => ({
      Client: class Bad {
        async createRun() {
          throw new Error('langsmith down')
        }
        async updateRun() {
          throw new Error('langsmith down')
        }
      },
    }))
    const { langsmith } = await import('../src/langsmith')
    const sink = langsmith({ apiKey: 'k' })
    expect(() => {
      sink.on(llmStart())
      sink.on(llmEnd())
    }).not.toThrow()
    await sink.flush()
  })
})
