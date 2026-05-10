import { describe, expect, it, vi } from 'vitest'
import { createControlSurface } from '../src/prod-control'

describe('createControlSurface', () => {
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
