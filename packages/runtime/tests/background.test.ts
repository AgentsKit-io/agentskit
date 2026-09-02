import { describe, expect, it, vi } from 'vitest'
import {
  cronMatches,
  createCronScheduler,
  createWebhookHandler,
  parseSchedule,
  type WebhookRequest,
} from '../src/background'
import type { AgentHandle } from '../src/topologies'

function agent(name: string, run: (task: string) => Promise<string> | string = async () => 'ok'): AgentHandle {
  return { name, run: async task => run(task) }
}

describe('parseSchedule', () => {
  it('parses 5-field cron', () => {
    const p = parseSchedule('0 9 * * 1')
    expect(p.type).toBe('cron')
    if (p.type !== 'cron') throw new Error('wrong type')
    expect(p.hour.has(9)).toBe(true)
    expect(p.dow.has(1)).toBe(true)
  })

  it('expands lists and steps', () => {
    const p = parseSchedule('*/15 * * * *')
    if (p.type !== 'cron') throw new Error('wrong type')
    expect(p.minute.has(0)).toBe(true)
    expect(p.minute.has(15)).toBe(true)
    expect(p.minute.has(30)).toBe(true)
    expect(p.minute.has(45)).toBe(true)
    expect(p.minute.has(5)).toBe(false)
  })

  it('expands ranges and lists', () => {
    const p = parseSchedule('1,5-7 * * * *')
    if (p.type !== 'cron') throw new Error('wrong type')
    expect(p.minute.has(1)).toBe(true)
    expect(p.minute.has(5)).toBe(true)
    expect(p.minute.has(6)).toBe(true)
    expect(p.minute.has(7)).toBe(true)
    expect(p.minute.has(2)).toBe(false)
  })

  it('parses every:<ms>', () => {
    const p = parseSchedule('every:1000')
    expect(p.type).toBe('every')
    if (p.type !== 'every') throw new Error('wrong type')
    expect(p.intervalMs).toBe(1000)
  })

  it('rejects malformed cron', () => {
    expect(() => parseSchedule('0 9')).toThrow(/5 fields/)
    expect(() => parseSchedule('every:-1')).toThrow(/invalid every:/)
    expect(() => parseSchedule('99 * * * *')).toThrow(/out of range/)
    expect(() => parseSchedule('0,,5 * * * *')).toThrow(/empty cron segment/)
    expect(() => parseSchedule('0 0 1-2-3 * *')).toThrow(/invalid cron range/)
  })
})

describe('cronMatches', () => {
  it('matches the right minute/hour', () => {
    const p = parseSchedule('30 9 * * *')
    if (p.type !== 'cron') throw new Error()
    expect(cronMatches(p, new Date(2026, 0, 1, 9, 30))).toBe(true)
    expect(cronMatches(p, new Date(2026, 0, 1, 9, 31))).toBe(false)
  })

  it('uses standard OR semantics for restricted day-of-month/day-of-week', () => {
    const p = parseSchedule('0 0 1 * 1')
    if (p.type !== 'cron') throw new Error()
    expect(cronMatches(p, new Date(2026, 8, 1, 0, 0))).toBe(true)
    expect(cronMatches(p, new Date(2026, 8, 7, 0, 0))).toBe(true)
  })
})

describe('createCronScheduler', () => {
  it('fires jobs on matching ticks', async () => {
    const run = vi.fn(async () => 'done')
    const sched = createCronScheduler({
      jobs: [{ schedule: '*/5 * * * *', agent: agent('job', run) }],
    })
    await sched.tick(new Date(2026, 0, 1, 9, 5)) // divisible by 5
    await sched.tick(new Date(2026, 0, 1, 9, 6))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('every:<ms> fires once per interval', async () => {
    const run = vi.fn(async () => 'done')
    const sched = createCronScheduler({
      jobs: [{ schedule: 'every:1000', agent: agent('j', run) }],
    })
    await sched.tick(new Date(1_000_000))
    await sched.tick(new Date(1_000_500))
    await sched.tick(new Date(1_002_000))
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('surfaces errors via onEvent instead of throwing', async () => {
    const events: string[] = []
    const sched = createCronScheduler({
      jobs: [
        {
          schedule: '* * * * *',
          agent: {
            name: 'bad',
            run: async () => {
              throw new Error('boom')
            },
          },
        },
      ],
      onEvent: e => events.push(e.type),
    })
    await sched.tick(new Date(2026, 0, 1, 9, 0))
    expect(events).toContain('run:error')
  })

  it('custom task callback receives the clock tick', async () => {
    const received: string[] = []
    const sched = createCronScheduler({
      jobs: [
        {
          schedule: '* * * * *',
          agent: agent('j', async t => {
            received.push(t)
            return 'ok'
          }),
          task: now => `at ${now.toISOString()}`,
        },
      ],
    })
    await sched.tick(new Date(Date.UTC(2026, 0, 1, 9, 0)))
    expect(received[0]).toMatch(/^at 2026-01-01T09:00/)
  })

  it('scheduleTick override lets us drive the loop synchronously', () => {
    const run = vi.fn(async () => 'ok')
    let registered: (() => void) | undefined
    const sched = createCronScheduler({
      jobs: [{ schedule: '* * * * *', agent: agent('j', run) }],
      scheduleTick: fn => {
        registered = fn
        return () => {
          registered = undefined
        }
      },
    })
    sched.start()
    expect(registered).toBeDefined()
    sched.stop()
    expect(registered).toBeUndefined()
  })

  it('runOnStart triggers an immediate fire', async () => {
    const run = vi.fn(async () => 'ok')
    const sched = createCronScheduler({
      jobs: [{ schedule: '* * * * *', agent: agent('j', run), runOnStart: true }],
      scheduleTick: () => () => {},
    })
    sched.start()
    await new Promise(r => setImmediate(r))
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('createWebhookHandler', () => {
  it('passes extracted task to the agent and returns 200 + body', async () => {
    const handler = createWebhookHandler({ agent: agent('a', async t => `ran: ${t}`), strict: false })
    const res = await handler({ body: 'hello' })
    expect(res.status).toBe(200)
    expect(res.body).toBe('ran: hello')
  })

  it('extracts .task from JSON body by default', async () => {
    const handler = createWebhookHandler({ agent: agent('a', async t => t), strict: false })
    const res = await handler({ body: { task: 'from-json' } as Record<string, unknown> })
    expect(res.body).toBe('from-json')
  })

  it('custom extractor wins', async () => {
    const handler = createWebhookHandler({
      agent: agent('a', async t => t),
      extractTask: (req: WebhookRequest) => (req.headers?.['x-task'] as string) ?? '',
      strict: false,
    })
    const res = await handler({ headers: { 'x-task': 'header-task' } })
    expect(res.body).toBe('header-task')
  })

  it('verify:false returns 401', async () => {
    const handler = createWebhookHandler({
      agent: agent('a'),
      verify: () => false,
    })
    const res = await handler({ body: 'x' })
    expect(res.status).toBe(401)
  })

  it('contains verifier failures and emits a sanitized rejection', async () => {
    const events: string[] = []
    const handler = createWebhookHandler({
      agent: agent('a'),
      verify: async () => { throw new Error('secret verifier detail') },
      onEvent: e => events.push(`${e.type}:${e.error ?? ''}`),
    })
    const res = await handler({ body: 'x' })
    expect(res).toEqual({ status: 500, body: 'internal error' })
    expect(events).toEqual(['received:', 'rejected:verification failed'])
  })

  it('refuses construction without verification unless strict:false is explicit', () => {
    expect(() => createWebhookHandler({ agent: agent('a') })).toThrow(/verify is missing/)
    expect(() => createWebhookHandler({ agent: agent('a'), strict: false })).not.toThrow()
  })

  it('returns 500 + message on agent failure', async () => {
    const handler = createWebhookHandler({
      agent: { name: 'bad', run: async () => { throw new Error('kaboom') } },
      strict: false,
    })
    const res = await handler({ body: 'x' })
    expect(res.status).toBe(500)
    expect(res.body).toBe('internal error')
  })

  it('fires received + handled events on success', async () => {
    const events: string[] = []
    const handler = createWebhookHandler({
      agent: agent('a'),
      strict: false,
      onEvent: e => events.push(e.type),
    })
    await handler({ body: 'x' })
    expect(events).toEqual(['received', 'handled'])
  })
})
