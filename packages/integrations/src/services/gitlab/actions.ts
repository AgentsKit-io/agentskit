import { defineAction } from '../../contract'

export const gitlabListProjects = defineAction({
  name: 'gitlab_list_projects',
  description: 'List GitLab projects the token is a member of (read-only).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Filter projects by name.' },
      limit: { type: 'number', description: 'Maximum projects to return (default 20).' },
    },
  },
  async execute(args, { http }) {
    const result = await http<Array<{
      id: number; path_with_namespace: string; web_url: string; default_branch?: string; visibility: string
    }>>({
      method: 'GET',
      path: '/api/v4/projects',
      query: {
        membership: 'true',
        search: args.search ? String(args.search) : undefined,
        per_page: typeof args.limit === 'number' ? args.limit : 20,
      },
    })
    return (result ?? []).map((p) => ({
      id: p.id,
      path: p.path_with_namespace,
      url: p.web_url,
      defaultBranch: p.default_branch,
      visibility: p.visibility,
    }))
  },
})

export const gitlabActions = [gitlabListProjects]
