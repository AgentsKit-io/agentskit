import { defineAction } from '../../contract'

export const hubspotSearchContacts = defineAction({
  name: 'hubspot_search_contacts',
  description: 'Search HubSpot contacts by email, name, or any property.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { query: { type: 'string' }, limit: { type: 'number' } },
    required: ['query'],
  },
  async execute(args, { http }) {
    const result = await http<{ results?: Array<{ id: string; properties: Record<string, string> }> }>({
      method: 'POST',
      path: '/crm/v3/objects/contacts/search',
      body: { query: String(args.query), limit: typeof args.limit === 'number' ? args.limit : 10, properties: ['email', 'firstname', 'lastname', 'company'] },
    })
    return (result.results ?? []).map((r) => ({
      id: r.id,
      email: r.properties.email,
      name: [r.properties.firstname, r.properties.lastname].filter(Boolean).join(' '),
      company: r.properties.company,
    }))
  },
})

export const hubspotCreateDeal = defineAction({
  name: 'hubspot_create_deal',
  description: 'Create a HubSpot deal.',
  sideEffect: 'external',
  sendCapability: 'deals.create',
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
  },
  async execute(args, { http }) {
    const properties: Record<string, string> = { dealname: String(args.dealname) }
    if (typeof args.amount === 'number') properties.amount = String(args.amount)
    if (args.pipeline) properties.pipeline = String(args.pipeline)
    if (args.dealstage) properties.dealstage = String(args.dealstage)
    const associations = args.contactId
      ? [{ to: { id: String(args.contactId) }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] }]
      : undefined
    const result = await http<{ id: string }>({ method: 'POST', path: '/crm/v3/objects/deals', body: { properties, associations } })
    return { id: result.id }
  },
})

export const hubspotActions = [hubspotSearchContacts, hubspotCreateDeal]
