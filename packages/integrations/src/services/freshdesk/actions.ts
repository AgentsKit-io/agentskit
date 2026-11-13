import { ErrorCodes, ToolError } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from '../../http'
import { defineAction } from '../../contract'

interface FreshdeskRuntimeConfig {
  domain: string
  apiKey: string
}

const DOMAIN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i

// Freshdesk API-key auth: Basic `{apiKey}:X`.
// https://developers.freshdesk.com/api/#authentication
function opts(config: unknown, fetch: typeof globalThis.fetch, signal?: AbortSignal): HttpToolOptions {
  const cfg = (config ?? {}) as Partial<FreshdeskRuntimeConfig>
  if (!cfg.domain || !cfg.apiKey) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: 'freshdesk: missing domain or apiKey in config',
      hint: 'Provide the Freshdesk domain (the "acme" in acme.freshdesk.com) and the API key from your profile settings.',
    })
  }
  if (!DOMAIN.test(cfg.domain)) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: 'freshdesk: invalid domain',
      hint: 'Use only the domain label (e.g. "acme"), not a full URL or host.',
    })
  }
  const auth = `Basic ${Buffer.from(`${cfg.apiKey}:X`).toString('base64')}`
  return { baseUrl: `https://${cfg.domain}.freshdesk.com/`, headers: { authorization: auth }, fetch, signal }
}

interface FreshdeskTicket {
  id: number
  subject?: string
  status?: number
  priority?: number
  updated_at?: string
}

const summarize = (t: FreshdeskTicket) => ({
  id: t.id,
  subject: t.subject,
  status: t.status,
  priority: t.priority,
  updatedAt: t.updated_at,
})

export const freshdeskListTickets = defineAction({
  name: 'freshdesk_list_tickets',
  description: 'List Freshdesk tickets (read-only). Docs: https://developers.freshdesk.com/api/#list_all_tickets',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { per_page: { type: 'number', description: 'Page size, 1-100. Default 30.' } },
  },
  async execute(args, { fetch, signal, config }) {
    const result = await httpJson<FreshdeskTicket[]>(opts(config, fetch, signal), {
      method: 'GET',
      path: '/api/v2/tickets',
      query: { per_page: typeof args.per_page === 'number' ? args.per_page : 30 },
    })
    return (result ?? []).map(summarize)
  },
})

export const freshdeskGetTicket = defineAction({
  name: 'freshdesk_get_ticket',
  description: 'Get a Freshdesk ticket by id (read-only).',
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
        message: 'freshdesk_get_ticket: id must be a positive integer',
        hint: 'Pass the numeric ticket id.',
      })
    }
    const result = await httpJson<FreshdeskTicket>(opts(config, fetch, signal), {
      method: 'GET',
      path: `/api/v2/tickets/${args.id}`,
    })
    return summarize(result)
  },
})

export const freshdeskActions = [freshdeskListTickets, freshdeskGetTicket]
