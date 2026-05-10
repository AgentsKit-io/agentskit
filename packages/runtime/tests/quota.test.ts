import { describe, expect, it, vi } from 'vitest'
import { createQuotaTracker, withQuotas } from '../src/quota'
import { ErrorCodes, defineTool } from '@agentskit/core'

describe('createQuotaTracker', () => {
  it('throws when perRun cap is exceeded', () => {
    const tracker = createQuotaTracker({
      quotas: { sendEmail: { perRun: 2 } },
    })
    tracker.check('sendEmail', 'r1')
    tracker.record('sendEmail', 'r1')
    tracker.check('sendEmail', 'r1')
    tracker.record('sendEmail', 'r1')
    expect(() => tracker.check('sendEmail', 'r1')).toThrow(/per-run quota/)
  })

  it('isolates counters per run', () => {
    const tracker = createQuotaTracker({
      quotas: { sendEmail: { perRun: 1 } },
    })
    tracker.check('sendEmail', 'r1')
    tracker.record('sendEmail', 'r1')
    tracker.check('sendEmail', 'r2')
    tracker.record('sendEmail', 'r2')
    expect(() => tracker.check('sendEmail', 'r1')).toThrow()
    expect(() => tracker.check('sendEmail', 'r2')).toThrow()
  })

  it('resets per-run counters with resetRun', () => {
    const tracker = createQuotaTracker({
      quotas: { sendEmail: { perRun: 1 } },
    })
    tracker.check('sendEmail', 'r1')
    tracker.record('sendEmail', 'r1')
    tracker.resetRun('r1')
    tracker.check('sendEmail', 'r1')
  })

  it('enforces a sliding-window cap', () => {
    let t = 0
    const tracker = createQuotaTracker({
      quotas: { browser_click: { perWindow: { count: 2, windowMs: 1_000 } } },
      now: () => t,
    })
    tracker.check('browser_click', 'r1')
    tracker.record('browser_click', 'r1')
    t = 200
    tracker.check('browser_click', 'r1')
    tracker.record('browser_click', 'r1')
    t = 400
    expect(() => tracker.check('browser_click', 'r1')).toThrow(/sliding-window/)
    t = 1_500
    tracker.check('browser_click', 'r1')
  })

  it('blocks dry-run-required tools in matched env', () => {
    const tracker = createQuotaTracker({
      quotas: { executeSql: { dryRunRequiredIn: ['production'] } },
      env: 'production',
    })
    expect(() => tracker.check('executeSql', 'r1')).toThrow(/dry-run/)
  })

  it('emits onExceeded events', () => {
    const onExceeded = vi.fn()
    const tracker = createQuotaTracker({
      quotas: { sendEmail: { perRun: 0 } },
      onExceeded,
    })
    expect(() => tracker.check('sendEmail', 'r1')).toThrow()
    expect(onExceeded).toHaveBeenCalledOnce()
    expect(onExceeded.mock.calls[0]![0].kind).toBe('perRun')
    expect(onExceeded.mock.calls[0]![0].limit).toBe(0)
  })

  it('throws ToolError with AK_TOOL_QUOTA_EXCEEDED code', () => {
    const tracker = createQuotaTracker({
      quotas: { x: { perRun: 0 } },
    })
    try {
      tracker.check('x', 'r1')
      expect.unreachable()
    } catch (err) {
      expect((err as { code: string }).code).toBe(ErrorCodes.AK_TOOL_QUOTA_EXCEEDED)
    }
  })
})

describe('withQuotas', () => {
  it('wraps tool.execute with check + record', async () => {
    const tracker = createQuotaTracker({
      quotas: { send: { perRun: 1 } },
    })
    let calls = 0
    const tool = defineTool({
      name: 'send',
      description: 'send a message',
      execute: async () => {
        calls += 1
        return 'ok'
      },
    })
    const [wrapped] = withQuotas([tool], tracker, () => 'r1')
    const ctx = { messages: [], call: { id: '1', name: 'send', args: {}, status: 'running' as const } }
    await wrapped.execute!({}, ctx)
    expect(calls).toBe(1)
    await expect(wrapped.execute!({}, ctx)).rejects.toThrow(/per-run quota/)
  })
})
