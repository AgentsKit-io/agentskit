import { defineAction } from '../../contract'

export const baserowListRows = defineAction({
  name: 'baserow_list_rows',
  description: 'List rows from a Baserow table.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { table_id: { type: 'number' }, size: { type: 'number' } },
    required: ['table_id'],
  },
  async execute(args, { http }) {
    const result = await http<{ results?: Array<Record<string, unknown>>; count?: number }>({
      method: 'GET',
      path: `/database/rows/table/${args.table_id}/`,
      query: { user_field_names: 'true', size: typeof args.size === 'number' ? args.size : 50 },
    })
    return { count: result.count ?? 0, rows: result.results ?? [] }
  },
})

export const baserowCreateRow = defineAction({
  name: 'baserow_create_row',
  description: 'Create a row in a Baserow table.',
  sideEffect: 'external',
  sendCapability: 'rows.create',
  schema: {
    type: 'object',
    properties: { table_id: { type: 'number' }, fields: { type: 'object', description: 'Field name → value map.' } },
    required: ['table_id', 'fields'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: number }>({
      method: 'POST',
      path: `/database/rows/table/${args.table_id}/`,
      query: { user_field_names: 'true' },
      body: args.fields,
    })
    return { id: result.id }
  },
})

export const baserowActions = [baserowListRows, baserowCreateRow]
