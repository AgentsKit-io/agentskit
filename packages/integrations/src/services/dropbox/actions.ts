import { defineAction } from '../../contract'

export const dropboxListFolder = defineAction({
  name: 'dropbox_list_folder',
  description: 'List the contents of a Dropbox folder.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'Folder path; "" for the root.' } },
  },
  async execute(args, { http }) {
    const result = await http<{ entries?: Array<{ '.tag': string; name: string; path_display?: string; id: string }> }>({
      method: 'POST',
      path: '/files/list_folder',
      body: { path: typeof args.path === 'string' ? args.path : '' },
    })
    return (result.entries ?? []).map((e) => ({ type: e['.tag'], name: e.name, path: e.path_display, id: e.id }))
  },
})

export const dropboxCreateFolder = defineAction({
  name: 'dropbox_create_folder',
  description: 'Create a folder in Dropbox.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'Full path of the folder to create, e.g. /reports/2026.' } },
    required: ['path'],
  },
  async execute(args, { http }) {
    const result = await http<{ metadata: { id: string; name: string; path_display?: string } }>({
      method: 'POST',
      path: '/files/create_folder_v2',
      body: { path: args.path, autorename: false },
    })
    return { id: result.metadata.id, name: result.metadata.name, path: result.metadata.path_display }
  },
})

export const dropboxActions = [dropboxListFolder, dropboxCreateFolder]
