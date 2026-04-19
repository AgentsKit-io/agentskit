import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface LinearConfig extends HttpToolOptions {
  apiKey: string
}

function opts(config: LinearConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.linear.app/graphql',
    headers: { authorization: config.apiKey, ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

async function gql<TResult>(config: LinearConfig, query: string, variables: Record<string, unknown>): Promise<TResult> {
  const result = await httpJson<{ data?: TResult; errors?: Array<{ message: string }> }>(opts(config), {
    method: 'POST',
    path: '',
    body: { query, variables },
  })
  if (result.errors?.length) throw new Error(`linear: ${result.errors.map(e => e.message).join('; ')}`)
  if (!result.data) throw new Error('linear: empty response')
  return result.data
}

export function linearSearchIssues(config: LinearConfig) {
  return defineTool({
    name: 'linear_search_issues',
    description: 'Search Linear issues by a text query.',
    schema: {
      type: 'object',
      properties: { query: { type: 'string' }, first: { type: 'number' } },
      required: ['query'],
    } as const,
    async execute({ query, first }) {
      const data = await gql<{ issueSearch: { nodes: Array<{ id: string; identifier: string; title: string; url: string; state: { name: string } }> } }>(
        config,
        `query Search($q: String!, $first: Int!) { issueSearch(query: $q, first: $first) { nodes { id identifier title url state { name } } } }`,
        { q: query, first: first ?? 10 },
      )
      return data.issueSearch.nodes.map(n => ({
        id: n.identifier,
        title: n.title,
        url: n.url,
        state: n.state.name,
      }))
    },
  })
}

export function linearCreateIssue(config: LinearConfig) {
  return defineTool({
    name: 'linear_create_issue',
    description: 'Create a new Linear issue in a team.',
    schema: {
      type: 'object',
      properties: {
        teamId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['teamId', 'title'],
    } as const,
    async execute({ teamId, title, description }) {
      const data = await gql<{ issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } } }>(
        config,
        `mutation Create($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }`,
        { input: { teamId, title, description: description ?? '' } },
      )
      if (!data.issueCreate.success) throw new Error('linear: issue create failed')
      return { id: data.issueCreate.issue.identifier, url: data.issueCreate.issue.url }
    },
  })
}

export function linear(config: LinearConfig) {
  return [linearSearchIssues(config), linearCreateIssue(config)]
}
