import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

interface SupabaseProject {
  id: string
  name: string
  organization_id?: string
  region?: string
  status?: string
  created_at?: string
}

// Project refs are 20-char lowercase slugs; reject anything that could alter the path.
const PROJECT_REF = /^[a-z0-9]{10,40}$/

function summarize(p: SupabaseProject) {
  return {
    ref: p.id,
    name: p.name,
    organizationId: p.organization_id,
    region: p.region,
    status: p.status,
    createdAt: p.created_at,
  }
}

export const supabaseListProjects = defineAction({
  name: 'supabase_list_projects',
  description:
    'List Supabase projects visible to the access token (read-only). Also validates the credential.',
  sideEffect: 'read',
  schema: { type: 'object', properties: {} },
  async execute(_args, { http }) {
    const result = await http<SupabaseProject[]>({ method: 'GET', path: '/v1/projects' })
    return (result ?? []).map(summarize)
  },
})

export const supabaseGetProject = defineAction({
  name: 'supabase_get_project',
  description: 'Get public metadata of one Supabase project by ref (read-only).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { ref: { type: 'string', description: 'Project ref, e.g. abcdefghijklmnopqrst' } },
    required: ['ref'],
  },
  async execute(args, { http }) {
    const ref = typeof args.ref === 'string' ? args.ref : ''
    if (!PROJECT_REF.test(ref)) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: 'supabase_get_project: "ref" must be a project ref (lowercase letters and digits, from supabase_list_projects)',
        hint: 'Call supabase_list_projects and pass the returned "ref".',
      })
    }
    const project = await http<SupabaseProject>({ method: 'GET', path: `/v1/projects/${ref}` })
    return summarize(project)
  },
})

export const supabaseActions = [supabaseListProjects, supabaseGetProject]
