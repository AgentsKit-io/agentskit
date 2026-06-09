import { defineAction } from '../../contract'

export const airtableListRecords = defineAction({
  name: 'airtable_list_records',
  description: 'List records from an Airtable table.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      table: { type: 'string', description: 'Table name or id.' },
      filterByFormula: { type: 'string' },
      pageSize: { type: 'number' },
    },
    required: ['table'],
  },
  async execute(args, { http }) {
    const result = await http<{ records?: Array<{ id: string; fields: Record<string, unknown> }>; offset?: string }>({
      method: 'GET',
      path: encodeURIComponent(String(args.table)),
      query: {
        filterByFormula: args.filterByFormula ? String(args.filterByFormula) : undefined,
        pageSize: typeof args.pageSize === 'number' ? args.pageSize : 50,
      },
    })
    return { records: (result.records ?? []).map((r) => ({ id: r.id, fields: r.fields })), offset: result.offset }
  },
})

export const airtableCreateRecord = defineAction({
  name: 'airtable_create_record',
  description: 'Create a record in an Airtable table.',
  sideEffect: 'external',
  sendCapability: 'records.create',
  schema: {
    type: 'object',
    properties: { table: { type: 'string' }, fields: { type: 'object', description: 'Field name → value map.' } },
    required: ['table', 'fields'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; fields: Record<string, unknown> }>({
      method: 'POST',
      path: encodeURIComponent(String(args.table)),
      body: { fields: args.fields },
    })
    return { id: result.id, fields: result.fields }
  },
})

export const airtableActions = [airtableListRecords, airtableCreateRecord]
