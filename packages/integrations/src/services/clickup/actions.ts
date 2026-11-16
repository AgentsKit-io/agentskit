import { defineAction } from '../../contract'

export const clickupListWorkspaces = defineAction({
  name: 'clickup_list_workspaces',
  description: 'List the ClickUp workspaces (teams) the token can access.',
  sideEffect: 'read',
  schema: { type: 'object', properties: {}, required: [] },
  async execute(_args, { http }) {
    const result = await http<{ teams?: Array<{ id: string; name: string }> }>({
      method: 'GET',
      path: '/api/v2/team',
    })
    return (result.teams ?? []).map((t) => ({ id: t.id, name: t.name }))
  },
})

export const clickupListTasks = defineAction({
  name: 'clickup_list_tasks',
  description: 'List tasks in a ClickUp list.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { list: { type: 'string', description: 'List id.' } },
    required: ['list'],
  },
  async execute(args, { http }) {
    const result = await http<{ tasks?: Array<{ id: string; name: string; url?: string }> }>({
      method: 'GET',
      path: `/api/v2/list/${encodeURIComponent(String(args.list))}/task`,
    })
    return (result.tasks ?? []).map((t) => ({ id: t.id, name: t.name, url: t.url }))
  },
})

export const clickupActions = [clickupListWorkspaces, clickupListTasks]
