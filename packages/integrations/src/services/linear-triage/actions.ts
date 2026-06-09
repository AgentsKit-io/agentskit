import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'
import { linearGql } from '../linear/gql'

export const linearTriageList = defineAction({
  name: 'linear_triage_list',
  description: "List issues currently in a team's triage state.",
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { teamId: { type: 'string' }, first: { type: 'number' } },
    required: ['teamId'],
  },
  async execute(args, { http }) {
    const data = await linearGql<{
      team: { issues: { nodes: Array<{ id: string; identifier: string; title: string; url: string; priority: number }> } }
    }>(
      http,
      `query Triage($teamId: String!, $first: Int!) {
        team(id: $teamId) {
          issues(first: $first, filter: { state: { type: { eq: "triage" } } }) {
            nodes { id identifier title url priority }
          }
        }
      }`,
      { teamId: args.teamId, first: typeof args.first === 'number' ? args.first : 25 },
    )
    return data.team.issues.nodes.map((n) => ({ id: n.identifier, title: n.title, url: n.url, priority: n.priority }))
  },
})

export const linearTriageAssign = defineAction({
  name: 'linear_triage_assign',
  description: 'Move a triage issue to a state and optionally assign someone.',
  sideEffect: 'write',
  schema: {
    type: 'object',
    properties: {
      issueId: { type: 'string' },
      stateId: { type: 'string', description: 'Target workflow state id (e.g. Backlog, Todo).' },
      assigneeId: { type: 'string' },
      priority: { type: 'number', description: '0 (none) to 4 (urgent).' },
    },
    required: ['issueId', 'stateId'],
  },
  async execute(args, { http }) {
    const data = await linearGql<{ issueUpdate: { success: boolean; issue: { identifier: string; url: string } } }>(
      http,
      `mutation Update($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success issue { identifier url } }
      }`,
      {
        id: args.issueId,
        input: {
          stateId: args.stateId,
          ...(args.assigneeId ? { assigneeId: args.assigneeId } : {}),
          ...(typeof args.priority === 'number' ? { priority: args.priority } : {}),
        },
      },
    )
    if (!data.issueUpdate.success) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: 'linear: triage update failed',
        hint: `issueId=${args.issueId}, stateId=${args.stateId}.`,
      })
    }
    return { id: data.issueUpdate.issue.identifier, url: data.issueUpdate.issue.url }
  },
})

export const linearTriageActions = [linearTriageList, linearTriageAssign]
