import { defineAction } from '../../contract'

export const boxListItems = defineAction({
  name: 'box_list_items',
  description: 'List items in a Box folder (use "0" for the root folder).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { folder_id: { type: 'string' }, limit: { type: 'number' } },
    required: ['folder_id'],
  },
  async execute(args, { http }) {
    const result = await http<{ entries?: Array<{ type: string; id: string; name: string }> }>({
      method: 'GET',
      path: `/folders/${args.folder_id}/items`,
      query: { limit: typeof args.limit === 'number' ? args.limit : 100 },
    })
    return (result.entries ?? []).map((e) => ({ type: e.type, id: e.id, name: e.name }))
  },
})

export const boxCreateFolder = defineAction({
  name: 'box_create_folder',
  description: 'Create a folder in Box.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: { name: { type: 'string' }, parent_id: { type: 'string', description: 'Parent folder id; "0" for root.' } },
    required: ['name'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; name: string }>({
      method: 'POST',
      path: '/folders',
      body: { name: args.name, parent: { id: String(args.parent_id ?? '0') } },
    })
    return { id: result.id, name: result.name }
  },
})

export const boxActions = [boxListItems, boxCreateFolder]
