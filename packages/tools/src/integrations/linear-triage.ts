import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface LinearTriageConfig extends HttpToolOptions {
  apiKey: string
}

function opts(config: LinearTriageConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.linear.app/graphql',
    headers: { authorization: config.apiKey },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

async function gql<TResult>(config: LinearTriageConfig, query: string, variables: Record<string, unknown>): Promise<TResult> {
  const result = await httpJson<{ data?: TResult; errors?: Array<{ message: string }> }>(opts(config), {
    method: 'POST',
    path: '',
    body: { query, variables },
  })
  if (result.errors?.length) throw new Error(`linear: ${result.errors.map(e => e.message).join('; ')}`)
  if (!result.data) throw new Error('linear: empty response')
  return result.data
}

export function linearTriageList(config: LinearTriageConfig) {
  return defineTool({
    name: 'linear_triage_list',
    description: 'List issues currently in a team\'s triage state.',
    schema: {
      type: 'object',
      properties: {
        teamId: { type: 'string' },
        first: { type: 'number' },
      },
      required: ['teamId'],
    } as const,
    async execute({ teamId, first }) {
      const data = await gql<{
        team: { issues: { nodes: Array<{ id: string; identifier: string; title: string; url: string; priority: number }> } }
      }>(
        config,
        `query Triage($teamId: String!, $first: Int!) {
          team(id: $teamId) {
            issues(first: $first, filter: { state: { type: { eq: "triage" } } }) {
              nodes { id identifier title url priority }
            }
          }
        }`,
        { teamId, first: typeof first === 'number' ? first : 25 },
      )
      return data.team.issues.nodes.map(n => ({
        id: n.identifier,
        title: n.title,
        url: n.url,
        priority: n.priority,
      }))
    },
  })
}

export function linearTriageAssign(config: LinearTriageConfig) {
  return defineTool({
    name: 'linear_triage_assign',
    description: 'Move a triage issue to a state and optionally assign someone.',
    schema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' },
        stateId: { type: 'string', description: 'Target workflow state id (e.g. Backlog, Todo).' },
        assigneeId: { type: 'string' },
        priority: { type: 'number', description: '0 (none) to 4 (urgent).' },
      },
      required: ['issueId', 'stateId'],
    } as const,
    async execute({ issueId, stateId, assigneeId, priority }) {
      const data = await gql<{ issueUpdate: { success: boolean; issue: { identifier: string; url: string } } }>(
        config,
        `mutation Update($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) { success issue { identifier url } }
        }`,
        {
          id: issueId,
          input: {
            stateId,
            ...(assigneeId ? { assigneeId } : {}),
            ...(typeof priority === 'number' ? { priority } : {}),
          },
        },
      )
      if (!data.issueUpdate.success) throw new Error('linear: triage update failed')
      return { id: data.issueUpdate.issue.identifier, url: data.issueUpdate.issue.url }
    },
  })
}

export function linearTriage(config: LinearTriageConfig): ToolDefinition[] {
  return [
    linearTriageList(config) as unknown as ToolDefinition,
    linearTriageAssign(config) as unknown as ToolDefinition,
  ]
}
