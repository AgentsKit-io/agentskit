/**
 * Background agents: run a handler on a cron-ish interval or on
 * incoming webhooks. Zero-dependency — we parse a tiny cron subset
 * natively and return framework-agnostic HTTP handlers.
 */

import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AgentHandle } from './topologies'

// ---------------------------------------------------------------------------
// Cron scheduler (5-field minute cron: minute hour dom month dow)
// ---------------------------------------------------------------------------

export interface CronJob<TContext = unknown> {
  /** Standard 5-field cron (`* * * * *`) or an `every:<ms>` shortcut. */
  schedule: string
  agent: AgentHandle<TContext>
  /** Task the agent receives each fire. Default: `scheduled: <name>`. */
  task?: string | ((now: Date) => string)
  context?: TContext
  /** Run the job exactly once on start before the first tick. */
  runOnStart?: boolean
}

export interface CronSchedulerOptions<TContext = unknown> {
  jobs: CronJob<TContext>[]
  /** Observability hook. */
  onEvent?: (event: {
    type: 'tick' | 'run:start' | 'run:end' | 'run:error'
    job: string
    now: Date
    result?: string
    error?: string
  }) => void
  /** Clock override for tests. */
  now?: () => Date
  /** Timer override for tests — takes tick handler, returns stop fn. */
  scheduleTick?: (fn: () => void) => () => void
}

interface ParsedCron {
  type: 'cron'
  minute: Set<number>
  hour: Set<number>
  dom: Set<number>
  month: Set<number>
  dow: Set<number>
}

interface ParsedEvery {
  type: 'every'
  intervalMs: number
}

type ParsedSchedule = ParsedCron | ParsedEvery

function expandField(field: string, min: number, max: number): Set<number> {
  const out = new Set<number>()
  for (const segment of field.split(',')) {
    let step = 1
    let range = segment
    const stepIdx = segment.indexOf('/')
    if (stepIdx >= 0) {
      step = Math.max(1, Number(segment.slice(stepIdx + 1)))
      range = segment.slice(0, stepIdx)
    }
    let from = min
    let to = max
    if (range !== '*') {
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(Number)
        from = a ?? min
        to = b ?? max
      } else {
        from = Number(range)
        to = from
      }
    }
    for (let i = from; i <= to; i += step) out.add(i)
  }
  return out
}

export function parseSchedule(schedule: string): ParsedSchedule {
  const trimmed = schedule.trim()
  if (trimmed.startsWith('every:')) {
    const ms = Number(trimmed.slice('every:'.length))
    if (!Number.isFinite(ms) || ms <= 0) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `invalid every: schedule: "${schedule}"`,
        hint: 'Use every:<positiveMilliseconds>, e.g. every:60000.',
      })
    }
    return { type: 'every', intervalMs: ms }
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length !== 5) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `cron must have 5 fields: "${schedule}"`,
      hint: 'Use a 5-field cron (minute hour dom month dow) or every:<ms>.',
    })
  }
  return {
    type: 'cron',
    minute: expandField(parts[0]!, 0, 59),
    hour: expandField(parts[1]!, 0, 23),
    dom: expandField(parts[2]!, 1, 31),
    month: expandField(parts[3]!, 1, 12),
    dow: expandField(parts[4]!, 0, 6),
  }
}

export function cronMatches(schedule: ParsedCron, now: Date): boolean {
  return (
    schedule.minute.has(now.getMinutes()) &&
    schedule.hour.has(now.getHours()) &&
    schedule.dom.has(now.getDate()) &&
    schedule.month.has(now.getMonth() + 1) &&
    schedule.dow.has(now.getDay())
  )
}

export interface CronScheduler {
  start: () => void
  stop: () => void
  /** Manually fire every job whose schedule matches `now`. Useful in tests. */
  tick: (now?: Date) => Promise<void>
}

export function createCronScheduler<TContext = unknown>(
  options: CronSchedulerOptions<TContext>,
): CronScheduler {
  const parsed = options.jobs.map(job => ({ job, schedule: parseSchedule(job.schedule), lastFireMs: -Infinity }))
  const clock = options.now ?? ((): Date => new Date())

  const fire = async (entry: (typeof parsed)[number], now: Date): Promise<void> => {
    const jobName = entry.job.agent.name
    options.onEvent?.({ type: 'run:start', job: jobName, now })
    try {
      const task = typeof entry.job.task === 'function' ? entry.job.task(now) : entry.job.task ?? `scheduled: ${jobName}`
      const result = await entry.job.agent.run(task, entry.job.context)
      options.onEvent?.({ type: 'run:end', job: jobName, now, result })
    } catch (err) {
      options.onEvent?.({
        type: 'run:error',
        job: jobName,
        now,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const tick = async (overrideNow?: Date): Promise<void> => {
    const now = overrideNow ?? clock()
    options.onEvent?.({ type: 'tick', job: '*', now })
    for (const entry of parsed) {
      if (entry.schedule.type === 'cron') {
        if (cronMatches(entry.schedule, now)) await fire(entry, now)
      } else {
        if (now.getTime() - entry.lastFireMs >= entry.schedule.intervalMs) {
          entry.lastFireMs = now.getTime()
          await fire(entry, now)
        }
      }
    }
  }

  let stopTick: (() => void) | undefined

  return {
    start() {
      if (stopTick) return
      if (options.scheduleTick) {
        stopTick = options.scheduleTick(() => void tick())
      } else {
        const interval = setInterval(() => void tick(), 60_000)
        stopTick = () => clearInterval(interval)
      }
      if (parsed.some(p => p.job.runOnStart)) {
        const now = clock()
        for (const entry of parsed) if (entry.job.runOnStart) void fire(entry, now)
      }
    },
    stop() {
      stopTick?.()
      stopTick = undefined
    },
    tick,
  }
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

export interface WebhookRequest {
  headers?: Record<string, string | string[] | undefined>
  body?: string | Record<string, unknown>
}

export interface WebhookResponse {
  status: number
  body: string
  headers?: Record<string, string>
}

export interface WebhookOptions<TContext = unknown> {
  agent: AgentHandle<TContext>
  /**
   * Extract the task string from the webhook body. Default:
   * `body.task` for JSON bodies, or the raw string.
   */
  extractTask?: (req: WebhookRequest) => string
  /** Pass-through context for the agent. */
  context?: TContext | ((req: WebhookRequest) => TContext)
  /** Verify the incoming request (signature, token, etc.). */
  verify?: (req: WebhookRequest) => boolean | Promise<boolean>
  onEvent?: (event: { type: 'received' | 'rejected' | 'handled'; error?: string }) => void
}

function defaultExtract(req: WebhookRequest): string {
  if (typeof req.body === 'string') return req.body
  if (req.body && typeof req.body === 'object' && typeof req.body.task === 'string') return req.body.task
  return JSON.stringify(req.body ?? '')
}

export type WebhookHandler = (req: WebhookRequest) => Promise<WebhookResponse>

/**
 * Build a framework-agnostic webhook handler. Wire into Express /
 * Hono / Next API routes by passing in the parsed request and
 * piping the returned response.
 */
export function createWebhookHandler<TContext = unknown>(
  options: WebhookOptions<TContext>,
): WebhookHandler {
  return async req => {
    options.onEvent?.({ type: 'received' })
    if (options.verify) {
      const ok = await options.verify(req)
      if (!ok) {
        options.onEvent?.({ type: 'rejected', error: 'verify returned false' })
        return { status: 401, body: 'unauthorized' }
      }
    }
    const extract = options.extractTask ?? defaultExtract
    const task = extract(req)
    const context =
      typeof options.context === 'function'
        ? (options.context as (req: WebhookRequest) => TContext)(req)
        : options.context
    try {
      const result = await options.agent.run(task, context)
      options.onEvent?.({ type: 'handled' })
      return {
        status: 200,
        body: result,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      options.onEvent?.({ type: 'rejected', error: message })
      return { status: 500, body: message }
    }
  }
}
