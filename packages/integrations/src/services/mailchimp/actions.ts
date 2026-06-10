import { httpJson, type HttpToolOptions } from '../../http'
import { defineAction } from '../../contract'

interface MailchimpRuntimeConfig {
  apiKey: string
  /** Datacenter suffix, e.g. "us21" (the part after "-" in the API key). */
  dc: string
}

function opts(config: unknown, fetch: typeof globalThis.fetch): HttpToolOptions {
  const cfg = config as MailchimpRuntimeConfig
  const auth = `Basic ${Buffer.from(`anystring:${cfg.apiKey}`).toString('base64')}`
  return { baseUrl: `https://${cfg.dc}.api.mailchimp.com/3.0/`, headers: { authorization: auth }, fetch }
}

export const mailchimpAddMember = defineAction({
  name: 'mailchimp_add_member',
  description: 'Add or update a member in a Mailchimp audience (list).',
  sideEffect: 'external',
  sendCapability: 'members.upsert',
  schema: {
    type: 'object',
    properties: {
      list_id: { type: 'string' },
      email: { type: 'string' },
      status: { type: 'string', enum: ['subscribed', 'pending', 'unsubscribed', 'cleaned'] },
    },
    required: ['list_id', 'email'],
  },
  async execute(args, { fetch, config }) {
    const result = await httpJson<{ id: string; email_address: string; status: string }>(opts(config, fetch), {
      method: 'POST',
      path: `lists/${args.list_id}/members`,
      body: { email_address: args.email, status: args.status ?? 'subscribed' },
    })
    return { id: result.id, email: result.email_address, status: result.status }
  },
})

export const mailchimpListAudiences = defineAction({
  name: 'mailchimp_list_audiences',
  description: 'List Mailchimp audiences (lists).',
  sideEffect: 'read',
  schema: { type: 'object', properties: {} },
  async execute(_args, { fetch, config }) {
    const result = await httpJson<{ lists?: Array<{ id: string; name: string; stats?: { member_count: number } }> }>(opts(config, fetch), {
      method: 'GET',
      path: 'lists',
    })
    return (result.lists ?? []).map((l) => ({ id: l.id, name: l.name, members: l.stats?.member_count }))
  },
})

export const mailchimpActions = [mailchimpAddMember, mailchimpListAudiences]
