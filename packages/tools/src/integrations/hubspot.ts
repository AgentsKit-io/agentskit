import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface HubspotConfig extends HttpToolOptions {
  /** Private app access token. */
  accessToken: string
}

function opts(config: HubspotConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.hubapi.com',
    headers: { authorization: `Bearer ${config.accessToken}` },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function hubspotSearchContacts(config: HubspotConfig) {
  return defineTool({
    name: 'hubspot_search_contacts',
    description: 'Search HubSpot contacts by email, name, or any property.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    } as const,
    async execute({ query, limit }) {
      const result = await httpJson<{
        results?: Array<{ id: string; properties: Record<string, string> }>
      }>(opts(config), {
        method: 'POST',
        path: '/crm/v3/objects/contacts/search',
        body: {
          query: String(query),
          limit: typeof limit === 'number' ? limit : 10,
          properties: ['email', 'firstname', 'lastname', 'company'],
        },
      })
      return (result.results ?? []).map(r => ({
        id: r.id,
        email: r.properties.email,
        name: [r.properties.firstname, r.properties.lastname].filter(Boolean).join(' '),
        company: r.properties.company,
      }))
    },
  })
}

export function hubspotCreateDeal(config: HubspotConfig) {
  return defineTool({
    name: 'hubspot_create_deal',
    description: 'Create a HubSpot deal.',
    schema: {
      type: 'object',
      properties: {
        dealname: { type: 'string' },
        amount: { type: 'number' },
        pipeline: { type: 'string' },
        dealstage: { type: 'string' },
        contactId: { type: 'string', description: 'Optional contact id to associate.' },
      },
      required: ['dealname'],
    } as const,
    async execute({ dealname, amount, pipeline, dealstage, contactId }) {
      const properties: Record<string, string> = { dealname: String(dealname) }
      if (typeof amount === 'number') properties.amount = String(amount)
      if (pipeline) properties.pipeline = String(pipeline)
      if (dealstage) properties.dealstage = String(dealstage)

      const associations = contactId
        ? [{ to: { id: String(contactId) }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] }]
        : undefined

      const result = await httpJson<{ id: string }>(opts(config), {
        method: 'POST',
        path: '/crm/v3/objects/deals',
        body: { properties, associations },
      })
      return { id: result.id }
    },
  })
}

export function hubspot(config: HubspotConfig): ToolDefinition[] {
  return [
    hubspotSearchContacts(config) as unknown as ToolDefinition,
    hubspotCreateDeal(config) as unknown as ToolDefinition,
  ]
}
