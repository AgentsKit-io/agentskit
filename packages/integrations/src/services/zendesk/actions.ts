import { ErrorCodes, ToolError } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from '../../http'
import { defineAction } from '../../contract'

interface ZendeskRuntimeConfig {
  subdomain: string
  email: string
  apiToken: string
}

const SUBDOMAIN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i

// Zendesk API-token auth: Basic `{email}/token:{apiToken}`.
// https://developer.zendesk.com/api-reference/introduction/security-and-auth/
function opts(config: unknown, fetch: typeof globalThis.fetch, signal?: AbortSignal): HttpToolOptions {
  const cfg = (config ?? {}) as Partial<ZendeskRuntimeConfig>
  if (!cfg.subdomain || !cfg.email || !cfg.apiToken) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: 'zendesk: missing subdomain, email or apiToken in config',
      hint: 'Provide the Zendesk subdomain (the "acme" in acme.zendesk.com), the agent email and an API token.',
    })
  }
  if (!SUBDOMAIN.test(cfg.subdomain)) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: 'zendesk: invalid subdomain',
      hint: 'Use only the subdomain label (e.g. "acme"), not a full URL or host.',
    })
  }
  const auth = `Basic ${Buffer.from(`${cfg.email}/token:${cfg.apiToken}`).toString('base64')}`
  return { baseUrl: `https://${cfg.subdomain}.zendesk.com/`, headers: { authorization: auth }, fetch, signal }
}

interface ZendeskTicket {
  id: number
  subject?: string
  status?: string
  priority?: string | null
  updated_at?: string
}

const summarize = (t: ZendeskTicket) => ({
  id: t.id,
  subject: t.subject,
  status: t.status,
  priority: t.priority ?? null,
  updatedAt: t.updated_at,
})

export const zendeskListTickets = defineAction({
  name: 'zendesk_list_tickets',
  description: 'List Zendesk Support tickets (read-only). Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { per_page: { type: 'number', description: 'Page size, 1-100. Default 25.' } },
  },
  async execute(args, { fetch, signal, config }) {
    const result = await httpJson<{ tickets?: ZendeskTicket[] }>(opts(config, fetch, signal), {
      method: 'GET',
      path: '/api/v2/tickets.json',
      query: { per_page: typeof args.per_page === 'number' ? args.per_page : 25 },
    })
    return (result.tickets ?? []).map(summarize)
  },
})

export const zendeskGetTicket = defineAction({
  name: 'zendesk_get_ticket',
  description: 'Get a Zendesk Support ticket by id (read-only).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { id: { type: 'number', description: 'Ticket id.' } },
    required: ['id'],
  },
  async execute(args, { fetch, signal, config }) {
    if (typeof args.id !== 'number' || !Number.isInteger(args.id) || args.id <= 0) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: 'zendesk_get_ticket: id must be a positive integer',
        hint: 'Pass the numeric ticket id.',
      })
    }
    const result = await httpJson<{ ticket: ZendeskTicket }>(opts(config, fetch, signal), {
      method: 'GET',
      path: `/api/v2/tickets/${args.id}.json`,
    })
    return summarize(result.ticket)
  },
})

export const zendeskActions = [zendeskListTickets, zendeskGetTicket]
