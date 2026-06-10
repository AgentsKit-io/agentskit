import { defineAction } from '../../contract'

export const driveListFiles = defineAction({
  name: 'drive_list_files',
  description: 'List Google Drive files matching an optional query.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Drive query, e.g. "name contains \'report\'".' },
      page_size: { type: 'number' },
    },
  },
  async execute(args, { http }) {
    const result = await http<{ files?: Array<{ id: string; name: string; mimeType: string }> }>({
      method: 'GET',
      path: '/files',
      query: {
        q: args.q ? String(args.q) : undefined,
        pageSize: typeof args.page_size === 'number' ? args.page_size : 25,
        fields: 'files(id,name,mimeType)',
      },
    })
    return (result.files ?? []).map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType }))
  },
})

export const driveCreateFolder = defineAction({
  name: 'drive_create_folder',
  description: 'Create a folder in Google Drive.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      parent_id: { type: 'string', description: 'Parent folder id (optional).' },
    },
    required: ['name'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; name: string }>({
      method: 'POST',
      path: '/files',
      body: {
        name: args.name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: args.parent_id ? [args.parent_id] : undefined,
      },
    })
    return { id: result.id, name: result.name }
  },
})

export const googleDriveActions = [driveListFiles, driveCreateFolder]
