import { defineAction } from '../../contract'

interface JiraRuntimeConfig {
  baseUrl: string
}

export const jiraSearchIssues = defineAction({
  name: 'jira_search_issues',
  description: 'Search Jira issues with JQL.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      jql: { type: 'string', description: 'JQL query, e.g. project = ENG AND status = "In Progress"' },
      maxResults: { type: 'number' },
    },
    required: ['jql'],
  },
  async execute(args, { http }) {
    const result = await http<{
      issues?: Array<{ key: string; fields: { summary: string; status: { name: string }; assignee?: { displayName: string } } }>
    }>({
      method: 'POST',
      path: '/rest/api/3/search',
      body: { jql: args.jql, maxResults: (args.maxResults as number) ?? 25, fields: ['summary', 'status', 'assignee'] },
    })
    return (result.issues ?? []).map((i) => ({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status.name,
      assignee: i.fields.assignee?.displayName ?? null,
    }))
  },
})

export const jiraCreateIssue = defineAction({
  name: 'jira_create_issue',
  description: 'Create a new Jira issue.',
  sideEffect: 'external',
  sendCapability: 'issue.create',
  schema: {
    type: 'object',
    properties: {
      projectKey: { type: 'string' },
      summary: { type: 'string' },
      description: { type: 'string' },
      issueType: { type: 'string', description: 'e.g. Task, Bug, Story. Default Task.' },
    },
    required: ['projectKey', 'summary'],
  },
  async execute(args, { http, config }) {
    const result = await http<{ key: string; self: string }>({
      method: 'POST',
      path: '/rest/api/3/issue',
      body: {
        fields: {
          project: { key: args.projectKey },
          summary: args.summary,
          description: args.description
            ? { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: String(args.description) }] }] }
            : undefined,
          issuetype: { name: args.issueType ?? 'Task' },
        },
      },
    })
    return { key: result.key, url: `${(config as JiraRuntimeConfig).baseUrl}/browse/${result.key}` }
  },
})

export const jiraActions = [jiraSearchIssues, jiraCreateIssue]
