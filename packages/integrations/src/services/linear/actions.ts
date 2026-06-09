import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'
import { linearGql } from './gql'

export const linearSearchIssues = defineAction({
  name: 'linear_search_issues',
  description: 'Search Linear issues by a text query.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { query: { type: 'string' }, first: { type: 'number' } },
    required: ['query'],
  },
  async execute(args, { http }) {
    const data = await linearGql<{ issueSearch: { nodes: Array<{ id: string; identifier: string; title: string; url: string; state: { name: string } }> } }>(
      http,
      `query Search($q: String!, $first: Int!) { issueSearch(query: $q, first: $first) { nodes { id identifier title url state { name } } } }`,
      { q: String(args.query), first: (args.first as number) ?? 10 },
    )
    return data.issueSearch.nodes.map((n) => ({ id: n.identifier, title: n.title, url: n.url, state: n.state.name }))
  },
})

export const linearCreateIssue = defineAction({
  name: 'linear_create_issue',
  description: 'Create a new Linear issue in a team.',
  sideEffect: 'external',
  sendCapability: 'issue.create',
  schema: {
    type: 'object',
    properties: { teamId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
    required: ['teamId', 'title'],
  },
  async execute(args, { http }) {
    const data = await linearGql<{ issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } } }>(
      http,
      `mutation Create($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }`,
      { input: { teamId: args.teamId, title: args.title, description: args.description ?? '' } },
    )
    if (!data.issueCreate.success) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: 'linear: issue create failed',
        hint: `teamId=${args.teamId}, title=${args.title}.`,
      })
    }
    return { id: data.issueCreate.issue.identifier, url: data.issueCreate.issue.url }
  },
})

export const linearActions = [linearSearchIssues, linearCreateIssue]
