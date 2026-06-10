import { defineAction } from '../../contract'

export const asanaCreateTask = defineAction({
  name: 'asana_create_task',
  description: 'Create an Asana task.',
  sideEffect: 'external',
  sendCapability: 'tasks.create',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      notes: { type: 'string' },
      workspace: { type: 'string', description: 'Workspace gid (required unless projects given).' },
      projects: { type: 'array', items: { type: 'string' }, description: 'Project gids.' },
    },
    required: ['name'],
  },
  async execute(args, { http }) {
    const data: Record<string, unknown> = { name: args.name, notes: args.notes }
    if (args.workspace) data.workspace = args.workspace
    if (Array.isArray(args.projects)) data.projects = args.projects
    const result = await http<{ data: { gid: string; name: string; permalink_url?: string } }>({
      method: 'POST',
      path: '/tasks',
      body: { data },
    })
    return { id: result.data.gid, name: result.data.name, url: result.data.permalink_url }
  },
})

export const asanaListTasks = defineAction({
  name: 'asana_list_tasks',
  description: 'List tasks in an Asana project.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { project: { type: 'string', description: 'Project gid.' }, limit: { type: 'number' } },
    required: ['project'],
  },
  async execute(args, { http }) {
    const result = await http<{ data?: Array<{ gid: string; name: string }> }>({
      method: 'GET',
      path: '/tasks',
      query: { project: String(args.project), limit: typeof args.limit === 'number' ? args.limit : 50 },
    })
    return (result.data ?? []).map((t) => ({ id: t.gid, name: t.name }))
  },
})

export const asanaActions = [asanaCreateTask, asanaListTasks]
