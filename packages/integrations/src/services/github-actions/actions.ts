import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

interface GithubActionsRuntimeConfig {
  defaultRepo?: string
}

function repoOf(config: unknown, repo: string | undefined): string {
  const r = repo ?? (config as GithubActionsRuntimeConfig | undefined)?.defaultRepo
  if (!r) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: 'githubActions: repo (owner/name) is required',
      hint: 'Pass repo in args or set defaultRepo in config.',
    })
  }
  return r
}

export const githubActionsListRuns = defineAction({
  name: 'github_actions_list_runs',
  description: 'List recent GitHub Actions workflow runs for a repo.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      repo: { type: 'string', description: 'owner/name. Defaults to config.defaultRepo.' },
      workflowFile: { type: 'string', description: 'e.g. ci.yml. If omitted, all workflows.' },
      status: { type: 'string', enum: ['queued', 'in_progress', 'completed'] },
      perPage: { type: 'number' },
    },
  },
  async execute(args, { http, config }) {
    const r = repoOf(config, args.repo as string | undefined)
    const path = args.workflowFile
      ? `/repos/${r}/actions/workflows/${args.workflowFile}/runs`
      : `/repos/${r}/actions/runs`
    const query: Record<string, string | number> = { per_page: typeof args.perPage === 'number' ? args.perPage : 20 }
    if (args.status) query.status = String(args.status)
    const result = await http<{
      workflow_runs?: Array<{
        id: number; name: string; head_branch: string; status: string;
        conclusion: string | null; html_url: string; created_at: string;
      }>
    }>({ method: 'GET', path, query })
    return (result.workflow_runs ?? []).map((run) => ({
      id: run.id,
      name: run.name,
      branch: run.head_branch,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      createdAt: run.created_at,
    }))
  },
})

export const githubActionsDispatch = defineAction({
  name: 'github_actions_dispatch',
  description: 'Manually trigger a GitHub Actions workflow_dispatch event.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      repo: { type: 'string' },
      workflowFile: { type: 'string', description: 'e.g. release.yml' },
      ref: { type: 'string', description: 'Branch or tag.' },
      inputs: { type: 'object', description: 'Workflow inputs map.' },
    },
    required: ['workflowFile', 'ref'],
  },
  async execute(args, { http, config }) {
    const r = repoOf(config, args.repo as string | undefined)
    await http({
      method: 'POST',
      path: `/repos/${r}/actions/workflows/${args.workflowFile}/dispatches`,
      body: { ref: String(args.ref), inputs: args.inputs ?? {} },
    })
    return { ok: true }
  },
})

export const githubActionsActions = [githubActionsListRuns, githubActionsDispatch]
