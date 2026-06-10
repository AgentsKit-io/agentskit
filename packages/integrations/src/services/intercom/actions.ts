import { defineAction } from '../../contract'

export const intercomCreateContact = defineAction({
  name: 'intercom_create_contact',
  description: 'Create an Intercom contact (user or lead).',
  sideEffect: 'external',
  sendCapability: 'contacts.create',
  schema: {
    type: 'object',
    properties: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string', enum: ['user', 'lead'] },
    },
    required: ['email'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; email?: string }>({
      method: 'POST',
      path: '/contacts',
      body: { role: args.role ?? 'user', email: args.email, name: args.name },
    })
    return { id: result.id, email: result.email }
  },
})

export const intercomListContacts = defineAction({
  name: 'intercom_list_contacts',
  description: 'List Intercom contacts.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { per_page: { type: 'number' } },
  },
  async execute(args, { http }) {
    const result = await http<{ data?: Array<{ id: string; email?: string; name?: string }> }>({
      method: 'GET',
      path: '/contacts',
      query: { per_page: typeof args.per_page === 'number' ? args.per_page : 25 },
    })
    return (result.data ?? []).map((c) => ({ id: c.id, email: c.email, name: c.name }))
  },
})

export const intercomActions = [intercomCreateContact, intercomListContacts]
