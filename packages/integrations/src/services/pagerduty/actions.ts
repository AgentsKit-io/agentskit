import { ConfigError, ErrorCodes, ToolError } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from '../../http'
import { defineAction } from '../../contract'

const EVENTS_BASE = 'https://events.pagerduty.com'
const REST_BASE = 'https://api.pagerduty.com'

export interface PagerDutyRuntimeConfig {
  routingKey: string
  apiToken?: string
  baseUrl?: string
  timeoutMs?: number
}

function eventsOpts(cfg: PagerDutyRuntimeConfig, fetch: typeof globalThis.fetch): HttpToolOptions {
  return {
    baseUrl: cfg.baseUrl ?? EVENTS_BASE,
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    timeoutMs: cfg.timeoutMs,
    fetch,
  }
}

function restOpts(cfg: PagerDutyRuntimeConfig, fetch: typeof globalThis.fetch): HttpToolOptions {
  if (!cfg.apiToken) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'pagerduty: apiToken required for REST queries' })
  }
  return {
    baseUrl: REST_BASE,
    headers: { authorization: `Token token=${cfg.apiToken}`, accept: 'application/vnd.pagerduty+json;version=2' },
    timeoutMs: cfg.timeoutMs,
    fetch,
  }
}

export const pagerdutyTrigger = defineAction({
  name: 'pagerduty_trigger',
  description: 'Trigger a PagerDuty incident via the Events API v2.',
  sideEffect: 'external',
  sendCapability: 'events.enqueue',
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Short human-readable summary.' },
      source: { type: 'string', description: 'Affected component / host.' },
      severity: { type: 'string', enum: ['critical', 'error', 'warning', 'info'] },
      dedup_key: { type: 'string', description: 'Idempotency / dedup key to ack/resolve later.' },
    },
    required: ['summary', 'source', 'severity'],
  },
  async execute(args, { fetch, config }) {
    const cfg = config as PagerDutyRuntimeConfig
    const result = await httpJson<{ status: string; dedup_key?: string; message?: string }>(eventsOpts(cfg, fetch), {
      method: 'POST',
      path: '/v2/enqueue',
      body: { routing_key: cfg.routingKey, event_action: 'trigger', dedup_key: args.dedup_key, payload: { summary: args.summary, source: args.source, severity: args.severity } },
    })
    if (result.status !== 'success') {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `pagerduty: ${result.message ?? 'trigger failed'}`, hint: `dedup_key=${args.dedup_key ?? '(none)'}.` })
    }
    return { dedup_key: result.dedup_key }
  },
})

function eventAction(action: 'acknowledge' | 'resolve') {
  return defineAction({
    name: `pagerduty_${action}`,
    description: `${action[0].toUpperCase() + action.slice(1)} a PagerDuty incident by dedup_key.`,
    sideEffect: 'external',
    schema: {
      type: 'object',
      properties: { dedup_key: { type: 'string', description: 'The dedup key returned by pagerduty_trigger.' } },
      required: ['dedup_key'],
    },
    async execute(args, { fetch, config }) {
      const cfg = config as PagerDutyRuntimeConfig
      const result = await httpJson<{ status: string; message?: string }>(eventsOpts(cfg, fetch), {
        method: 'POST',
        path: '/v2/enqueue',
        body: { routing_key: cfg.routingKey, event_action: action, dedup_key: args.dedup_key },
      })
      if (result.status !== 'success') {
        throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `pagerduty: ${result.message ?? `${action} failed`}`, hint: `dedup_key=${args.dedup_key}.` })
      }
      return { ok: true }
    },
  })
}

export const pagerdutyAcknowledge = eventAction('acknowledge')
export const pagerdutyResolve = eventAction('resolve')

export const pagerdutyOncall = defineAction({
  name: 'pagerduty_oncall',
  description: 'Look up the current on-call user for a PagerDuty schedule.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { schedule_id: { type: 'string', description: 'Schedule ID.' } },
    required: ['schedule_id'],
  },
  async execute(args, { fetch, config }) {
    const cfg = config as PagerDutyRuntimeConfig
    const result = await httpJson<{ users?: Array<{ id: string; name: string; email: string }> }>(restOpts(cfg, fetch), {
      method: 'GET',
      path: `/schedules/${args.schedule_id}/users`,
      query: { since: new Date().toISOString(), until: new Date(Date.now() + 60_000).toISOString() },
    })
    const user = result.users?.[0]
    return user ? { id: user.id, name: user.name, email: user.email } : null
  },
})

export const pagerdutyActions = [pagerdutyTrigger, pagerdutyAcknowledge, pagerdutyResolve, pagerdutyOncall]
