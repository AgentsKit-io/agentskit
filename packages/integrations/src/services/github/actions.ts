import { defineAction } from '../../contract'

export const githubSearchIssues = defineAction({
  name: 'github_search_issues',
  description: 'Search GitHub issues and pull requests by query.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'GitHub search query, e.g. "repo:owner/name is:open label:bug"' },
      per_page: { type: 'number', description: 'Results per page (default 10)' },
    },
    required: ['q'],
  },
  async execute(args, { http }) {
    const result = await http<{ items: Array<{ number: number; title: string; html_url: string; state: string }> }>({
      path: '/search/issues',
      query: { q: String(args.q), per_page: (args.per_page as number) ?? 10 },
    })
    return result.items.map((i) => ({ number: i.number, title: i.title, url: i.html_url, state: i.state }))
  },
})

export const githubCreateIssue = defineAction({
  name: 'github_create_issue',
  description: 'Open a new GitHub issue on a repository.',
  sideEffect: 'external',
  sendCapability: 'issues.create',
  schema: {
    type: 'object',
    properties: {
      owner: { type: 'string' },
      repo: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string' },
    },
    required: ['owner', 'repo', 'title'],
  },
  async execute(args, { http }) {
    const result = await http<{ number: number; html_url: string }>({
      method: 'POST',
      path: `/repos/${args.owner}/${args.repo}/issues`,
      body: { title: args.title, body: args.body ?? '' },
    })
    return { number: result.number, url: result.html_url }
  },
})

export const githubCommentIssue = defineAction({
  name: 'github_comment_issue',
  description: 'Comment on an existing GitHub issue.',
  sideEffect: 'external',
  sendCapability: 'issues.createComment',
  schema: {
    type: 'object',
    properties: {
      owner: { type: 'string' },
      repo: { type: 'string' },
      number: { type: 'number' },
      body: { type: 'string' },
    },
    required: ['owner', 'repo', 'number', 'body'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: number; html_url: string }>({
      method: 'POST',
      path: `/repos/${args.owner}/${args.repo}/issues/${args.number}/comments`,
      body: { body: args.body },
    })
    return { id: result.id, url: result.html_url }
  },
})

export const githubActionsList = [githubSearchIssues, githubCreateIssue, githubCommentIssue]
