import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface SentryConfig extends HttpToolOptions {
  /** Sentry auth token (User Auth Token). */
  authToken: string
  /** Org slug. Required for most endpoints. */
  organization: string
}

function opts(config: SentryConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://sentry.io/api/0',
    headers: { authorization: `Bearer ${config.authToken}` },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function sentrySearchIssues(config: SentryConfig) {
  return defineTool({
    name: 'sentry_search_issues',
    description: 'Search Sentry issues across an organization.',
    schema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project slug. Optional — searches the whole org if omitted.' },
        query: { type: 'string', description: 'Sentry search query, e.g. is:unresolved' },
        limit: { type: 'number' },
      },
    } as const,
    async execute({ project, query, limit }) {
      const path = project
        ? `/projects/${config.organization}/${project}/issues/`
        : `/organizations/${config.organization}/issues/`
      const result = await httpJson<Array<{
        id: string; shortId: string; title: string; status: string;
        level: string; permalink: string; lastSeen: string; count: string;
      }>>(opts(config), {
        method: 'GET',
        path,
        query: {
          query: query ? String(query) : undefined,
          limit: typeof limit === 'number' ? limit : 25,
        },
      })
      return (result ?? []).map(issue => ({
        id: issue.shortId,
        title: issue.title,
        status: issue.status,
        level: issue.level,
        url: issue.permalink,
        lastSeen: issue.lastSeen,
        count: issue.count,
      }))
    },
  })
}

export function sentryResolveIssue(config: SentryConfig) {
  return defineTool({
    name: 'sentry_resolve_issue',
    description: 'Mark a Sentry issue as resolved by id (numeric or shortId).',
    schema: {
      type: 'object',
      properties: { issueId: { type: 'string' } },
      required: ['issueId'],
    } as const,
    async execute({ issueId }) {
      await httpJson(opts(config), {
        method: 'PUT',
        path: `/issues/${issueId}/`,
        body: { status: 'resolved' },
      })
      return { ok: true }
    },
  })
}

export function sentry(config: SentryConfig): ToolDefinition[] {
  return [
    sentrySearchIssues(config) as unknown as ToolDefinition,
    sentryResolveIssue(config) as unknown as ToolDefinition,
  ]
}
