import { describe, expect, it, vi } from 'vitest'
import { ConfigError, ErrorCodes } from '@agentskit/core'
import { createControlSurface } from '../src/prod-control'

describe('createControlSurface', () => {
  it('rejects non-positive or non-integer snapshotBufferSize with ConfigError', () => {
    for (const snapshotBufferSize of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      try {
        createControlSurface({ snapshotBufferSize })
        expect.unreachable(`expected ConfigError for snapshotBufferSize=${String(snapshotBufferSize)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
        expect((error as ConfigError).message).toMatch(/snapshotBufferSize/)
      }
    }
    // Positive finite integers are accepted (including values below the old silent floor of 10).
    expect(() => createControlSurface({ snapshotBufferSize: 1 })).not.toThrow()
    expect(() => createControlSurface({ snapshotBufferSize: 3 })).not.toThrow()
  })

  it('pause + resume releases awaiters', async () => {
    const ctl = createControlSurface()
    ctl.pause('run-1')
    let resumed = false
    const p = ctl.awaitResume('run-1').then(() => {
      resumed = true
    })
    await Promise.resolve()
    expect(resumed).toBe(false)
    ctl.resume('run-1')
    await p
    expect(resumed).toBe(true)
  })

  it('step releases exactly one awaiter', async () => {
    const ctl = createControlSurface()
    ctl.pause('r')
    const a = ctl.awaitResume('r')
    const b = ctl.awaitResume('r')
    ctl.step('r')
    await a
    let bDone = false
    void b.then(() => {
      bDone = true
    })
    await Promise.resolve()
    expect(bDone).toBe(false)
  })

  it('inject + consumeOverride is single-shot', () => {
    const ctl = createControlSurface()
    ctl.inject('r', { tool: 'sendEmail', result: 'mocked', reason: 'incident' })
    expect(ctl.consumeOverride('r', 'sendEmail')?.result).toBe('mocked')
    expect(ctl.consumeOverride('r', 'sendEmail')).toBeUndefined()
  })

  it('snapshot captures recent events + overrides', () => {
    const ctl = createControlSurface()
    ctl.observer.on({ type: 'agent:step', runId: 'r', step: 1 } as never)
    ctl.observer.on({ type: 'agent:step', runId: 'r', step: 2 } as never)
    ctl.inject('r', { tool: 't', result: 'x' })
    const snap = ctl.snapshot('r', { ticket: 'SUP-42' })
    expect(snap.events).toHaveLength(2)
    expect(snap.overrides).toHaveLength(1)
    expect(snap.metadata?.ticket).toBe('SUP-42')
  })

  it('resolves run id via runIdOf, top-level runId/id, then defaultRunId', () => {
    const withCallback = createControlSurface({
      runIdOf: (event) => (event.type === 'agent:step' ? 'from-callback' : undefined),
      defaultRunId: 'default',
    })
    withCallback.observer.on({ type: 'agent:step', step: 1, action: 'initial' })
    expect(withCallback.snapshot('from-callback').events).toHaveLength(1)

    const withId = createControlSurface({ defaultRunId: 'default' })
    withId.observer.on({ type: 'llm:start', id: 'enriched-id', messageCount: 1 } as never)
    expect(withId.snapshot('enriched-id').events).toHaveLength(1)

    const withRunId = createControlSurface()
    withRunId.observer.on({ type: 'llm:end', runId: 'r2', content: 'x', durationMs: 1 } as never)
    expect(withRunId.snapshot('r2').events).toHaveLength(1)

    const withDefault = createControlSurface({ defaultRunId: 'run-default' })
    withDefault.observer.on({ type: 'agent:step', step: 1, action: 'initial' })
    withDefault.observer.on({ type: 'llm:start', messageCount: 2 })
    withDefault.observer.on({ type: 'llm:end', content: 'ok', durationMs: 5 })
    expect(withDefault.snapshot('run-default').events).toHaveLength(3)
  })

  it('runIdOf throw falls through to enriched/default run id without breaking observer.on', () => {
    const ctl = createControlSurface({
      runIdOf: () => {
        throw new Error('resolver-boom')
      },
      defaultRunId: 'fallback-run',
    })

    expect(() => {
      ctl.observer.on({ type: 'agent:step', step: 1, action: 'initial' })
    }).not.toThrow()
    expect(ctl.snapshot('fallback-run').events).toHaveLength(1)

    const enriched = createControlSurface({
      runIdOf: () => {
        throw new Error('resolver-boom')
      },
    })
    expect(() => {
      enriched.observer.on({ type: 'llm:start', runId: 'enriched-run', messageCount: 1 } as never)
    }).not.toThrow()
    expect(enriched.snapshot('enriched-run').events).toHaveLength(1)
  })

  it('snapshot events and overrides isolate top-level fields only (not nested deep clone)', () => {
    const ctl = createControlSurface({ defaultRunId: 'r' })
    const override = { tool: 't', result: 'x', reason: 'incident' }
    ctl.inject('r', override)
    const nested = { q: 'original' }
    const mutableEvent = {
      type: 'tool:start' as const,
      name: 'search',
      args: nested,
    }
    ctl.observer.on(mutableEvent)

    const snap = ctl.snapshot('r')
    // Top-level isolation: mutating the original override / event object or the
    // snapshot's top-level fields does not rewrite retained run state.
    override.result = 'mutated-after-inject'
    ;(mutableEvent as { name: string }).name = 'mutated-after-observe'
    snap.overrides[0]!.result = 'mutated-snapshot-override'
    ;(snap.events[0] as { name: string }).name = 'mutated-snapshot-event'

    const again = ctl.snapshot('r')
    expect(again.events[0]).toMatchObject({ type: 'tool:start', name: 'search' })
    expect(again.overrides[0]).toMatchObject({ tool: 't', result: 'x', reason: 'incident' })

    // Nested objects are shared references (shallow only) — mutation is visible.
    nested.q = 'nested-mutated'
    expect((again.events[0] as { args: { q: string } }).args.q).toBe('nested-mutated')
  })

  it('audit logs every control action', () => {
    const audit = vi.fn()
    const ctl = createControlSurface({ audit })
    ctl.pause('r', 'alice')
    ctl.resume('r', 'alice')
    ctl.inject('r', { tool: 't', result: 'x' }, 'bob')
    expect(audit).toHaveBeenCalledTimes(3)
    expect(audit.mock.calls[2]![0]).toMatchObject({ action: 'inject', actor: 'bob' })
  })

  it('httpHandler 401s without correct bearer token', async () => {
    const ctl = createControlSurface({ bearerToken: 'shhh' })
    const handler = ctl.httpHandler()
    const res = await handler({ method: 'POST', url: '/control/pause/r1', headers: {} })
    expect(res.status).toBe(401)
  })

  it('httpHandler routes pause/resume', async () => {
    const ctl = createControlSurface({ bearerToken: 'shhh' })
    const handler = ctl.httpHandler()
    const res = await handler({
      method: 'POST',
      url: '/control/pause/r1',
      headers: { authorization: 'Bearer shhh' },
      body: { actor: 'alice' },
    })
    expect(res.status).toBe(200)
  })
})
