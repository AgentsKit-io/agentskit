import { defineAction } from '../../contract'

export const attioQueryRecords = defineAction({
  name: 'attio_query_records',
  description: 'Query records of an Attio object (e.g. people, companies).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      object: { type: 'string', description: 'Object slug or id, e.g. "people".' },
      limit: { type: 'number' },
    },
    required: ['object'],
  },
  async execute(args, { http }) {
    const result = await http<{ data?: Array<{ id: { record_id: string }; values?: Record<string, unknown> }> }>({
      method: 'POST',
      path: `/objects/${args.object}/records/query`,
      body: { limit: typeof args.limit === 'number' ? args.limit : 25 },
    })
    return (result.data ?? []).map((r) => ({ id: r.id.record_id, values: r.values ?? {} }))
  },
})

export const attioCreateRecord = defineAction({
  name: 'attio_create_record',
  description: 'Create a record for an Attio object.',
  sideEffect: 'external',
  sendCapability: 'records.create',
  schema: {
    type: 'object',
    properties: {
      object: { type: 'string' },
      values: { type: 'object', description: 'Attribute slug → value(s) map.' },
    },
    required: ['object', 'values'],
  },
  async execute(args, { http }) {
    const result = await http<{ data: { id: { record_id: string } } }>({
      method: 'POST',
      path: `/objects/${args.object}/records`,
      body: { data: { values: args.values } },
    })
    return { id: result.data.id.record_id }
  },
})

export const attioActions = [attioQueryRecords, attioCreateRecord]
