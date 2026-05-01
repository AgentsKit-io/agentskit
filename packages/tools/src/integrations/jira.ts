import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface JiraConfig extends HttpToolOptions {
  /** Atlassian site root, e.g. `https://my-org.atlassian.net`. */
  baseUrl: string
  /** Atlassian account email. */
  email: string
  /** Atlassian API token (NOT a password). */
  apiToken: string
}

function opts(config: JiraConfig): HttpToolOptions {
  const auth = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`
  return {
    baseUrl: config.baseUrl,
    headers: { authorization: auth },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function jiraSearchIssues(config: JiraConfig) {
  return defineTool({
    name: 'jira_search_issues',
    description: 'Search Jira issues with JQL.',
    schema: {
      type: 'object',
      properties: {
        jql: { type: 'string', description: 'JQL query, e.g. project = ENG AND status = "In Progress"' },
        maxResults: { type: 'number' },
      },
      required: ['jql'],
    } as const,
    async execute({ jql, maxResults }) {
      const result = await httpJson<{
        issues?: Array<{ key: string; fields: { summary: string; status: { name: string }; assignee?: { displayName: string } } }>
      }>(opts(config), {
        method: 'POST',
        path: '/rest/api/3/search',
        body: { jql, maxResults: maxResults ?? 25, fields: ['summary', 'status', 'assignee'] },
      })
      return (result.issues ?? []).map(i => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status.name,
        assignee: i.fields.assignee?.displayName ?? null,
      }))
    },
  })
}

export function jiraCreateIssue(config: JiraConfig) {
  return defineTool({
    name: 'jira_create_issue',
    description: 'Create a new Jira issue.',
    schema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
        issueType: { type: 'string', description: 'e.g. Task, Bug, Story. Default Task.' },
      },
      required: ['projectKey', 'summary'],
    } as const,
    async execute({ projectKey, summary, description, issueType }) {
      const result = await httpJson<{ key: string; self: string }>(opts(config), {
        method: 'POST',
        path: '/rest/api/3/issue',
        body: {
          fields: {
            project: { key: projectKey },
            summary,
            description: description ? {
              type: 'doc',
              version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: String(description) }] }],
            } : undefined,
            issuetype: { name: issueType ?? 'Task' },
          },
        },
      })
      return { key: result.key, url: `${config.baseUrl}/browse/${result.key}` }
    },
  })
}

export function jira(config: JiraConfig): ToolDefinition[] {
  return [
    jiraSearchIssues(config) as unknown as ToolDefinition,
    jiraCreateIssue(config) as unknown as ToolDefinition,
  ]
}
