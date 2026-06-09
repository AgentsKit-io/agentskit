import { defineAction } from '../../contract'

interface SentryRuntimeConfig {
  organization: string
}

function orgOf(config: unknown): string {
  return (config as SentryRuntimeConfig).organization
}

export const sentrySearchIssues = defineAction({
  name: 'sentry_search_issues',
  description: 'Search Sentry issues across an organization.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Project slug. Optional — searches the whole org if omitted.' },
      query: { type: 'string', description: 'Sentry search query, e.g. is:unresolved' },
      limit: { type: 'number' },
    },
  },
  async execute(args, { http, config }) {
    const org = orgOf(config)
    const path = args.project
      ? `/projects/${org}/${args.project}/issues/`
      : `/organizations/${org}/issues/`
    const result = await http<Array<{
      id: string; shortId: string; title: string; status: string;
      level: string; permalink: string; lastSeen: string; count: string;
    }>>({
      method: 'GET',
      path,
      query: {
        query: args.query ? String(args.query) : undefined,
        limit: typeof args.limit === 'number' ? args.limit : 25,
      },
    })
    return (result ?? []).map((issue) => ({
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

export const sentryResolveIssue = defineAction({
  name: 'sentry_resolve_issue',
  description: 'Mark a Sentry issue as resolved by id (numeric or shortId).',
  sideEffect: 'write',
  schema: {
    type: 'object',
    properties: { issueId: { type: 'string' } },
    required: ['issueId'],
  },
  async execute(args, { http }) {
    await http({ method: 'PUT', path: `/issues/${args.issueId}/`, body: { status: 'resolved' } })
    return { ok: true }
  },
})

export const sentryActions = [sentrySearchIssues, sentryResolveIssue]
