import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface GitHubActionsConfig extends HttpToolOptions {
  token: string
  /** Default `owner/repo` if omitted from per-call args. */
  defaultRepo?: string
}

function opts(config: GitHubActionsConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.github.com',
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

function repoOf(config: GitHubActionsConfig, repo: string | undefined): string {
  const r = repo ?? config.defaultRepo
  if (!r) throw new Error('githubActions: repo (owner/name) is required')
  return r
}

export function githubActionsListRuns(config: GitHubActionsConfig) {
  return defineTool({
    name: 'github_actions_list_runs',
    description: 'List recent GitHub Actions workflow runs for a repo.',
    schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'owner/name. Defaults to config.defaultRepo.' },
        workflowFile: { type: 'string', description: 'e.g. ci.yml. If omitted, all workflows.' },
        status: { type: 'string', enum: ['queued', 'in_progress', 'completed'] },
        perPage: { type: 'number' },
      },
    } as const,
    async execute({ repo, workflowFile, status, perPage }) {
      const r = repoOf(config, repo as string | undefined)
      const path = workflowFile
        ? `/repos/${r}/actions/workflows/${workflowFile}/runs`
        : `/repos/${r}/actions/runs`
      const query: Record<string, string | number> = { per_page: typeof perPage === 'number' ? perPage : 20 }
      if (status) query.status = String(status)
      const result = await httpJson<{
        workflow_runs?: Array<{
          id: number; name: string; head_branch: string; status: string;
          conclusion: string | null; html_url: string; created_at: string;
        }>
      }>(opts(config), { method: 'GET', path, query })
      return (result.workflow_runs ?? []).map(run => ({
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
}

export function githubActionsDispatch(config: GitHubActionsConfig) {
  return defineTool({
    name: 'github_actions_dispatch',
    description: 'Manually trigger a GitHub Actions workflow_dispatch event.',
    schema: {
      type: 'object',
      properties: {
        repo: { type: 'string' },
        workflowFile: { type: 'string', description: 'e.g. release.yml' },
        ref: { type: 'string', description: 'Branch or tag.' },
        inputs: { type: 'object', description: 'Workflow inputs map.' },
      },
      required: ['workflowFile', 'ref'],
    } as const,
    async execute({ repo, workflowFile, ref, inputs }) {
      const r = repoOf(config, repo as string | undefined)
      await httpJson(opts(config), {
        method: 'POST',
        path: `/repos/${r}/actions/workflows/${workflowFile}/dispatches`,
        body: { ref: String(ref), inputs: inputs ?? {} },
      })
      return { ok: true }
    },
  })
}

export function githubActions(config: GitHubActionsConfig): ToolDefinition[] {
  return [
    githubActionsListRuns(config) as unknown as ToolDefinition,
    githubActionsDispatch(config) as unknown as ToolDefinition,
  ]
}
