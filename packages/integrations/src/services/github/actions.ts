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

export const githubCreatePrReviewComment = defineAction({
  name: 'github_create_pr_review_comment',
  description:
    'Post a single line-level review comment on a pull request. Anchored to a line in a specific commit; the line must be part of the diff.',
  sideEffect: 'external',
  sendCapability: 'pulls.createReviewComment',
  schema: {
    type: 'object',
    properties: {
      owner: { type: 'string' },
      repo: { type: 'string' },
      number: { type: 'number', description: 'Pull request number.' },
      body: { type: 'string', description: 'Comment text (Markdown).' },
      commit_id: { type: 'string', description: 'SHA of the commit to anchor the comment to (the PR head).' },
      path: { type: 'string', description: 'File path relative to the repo root.' },
      line: { type: 'number', description: 'Line number in the file (in the diff), 1-based.' },
      side: { type: 'string', enum: ['LEFT', 'RIGHT'], description: 'Diff side; default RIGHT (the new version).' },
      start_line: { type: 'number', description: 'For a multi-line comment, the first line of the range.' },
      start_side: { type: 'string', enum: ['LEFT', 'RIGHT'] },
    },
    required: ['owner', 'repo', 'number', 'body', 'commit_id', 'path', 'line'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: number; html_url: string }>({
      method: 'POST',
      path: `/repos/${args.owner}/${args.repo}/pulls/${args.number}/comments`,
      body: {
        body: args.body,
        commit_id: args.commit_id,
        path: args.path,
        line: args.line,
        ...(args.side ? { side: args.side } : {}),
        ...(args.start_line ? { start_line: args.start_line } : {}),
        ...(args.start_side ? { start_side: args.start_side } : {}),
      },
    })
    return { id: result.id, url: result.html_url }
  },
})

export const githubCreatePrReview = defineAction({
  name: 'github_create_pr_review',
  description:
    'Submit a pull-request review in one call: an overall verdict (APPROVE / REQUEST_CHANGES / COMMENT), an optional summary body, and any number of line-level inline comments.',
  sideEffect: 'external',
  sendCapability: 'pulls.createReview',
  schema: {
    type: 'object',
    properties: {
      owner: { type: 'string' },
      repo: { type: 'string' },
      number: { type: 'number', description: 'Pull request number.' },
      event: {
        type: 'string',
        enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'],
        description: 'The review verdict.',
      },
      body: { type: 'string', description: 'Overall review summary (Markdown).' },
      commit_id: { type: 'string', description: 'SHA the review applies to; defaults to the PR head.' },
      comments: {
        type: 'array',
        description: 'Inline comments to attach to the review.',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            line: { type: 'number' },
            side: { type: 'string', enum: ['LEFT', 'RIGHT'] },
            start_line: { type: 'number' },
            start_side: { type: 'string', enum: ['LEFT', 'RIGHT'] },
            body: { type: 'string' },
          },
          required: ['path', 'line', 'body'],
        },
      },
    },
    required: ['owner', 'repo', 'number', 'event'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: number; html_url: string; state: string }>({
      method: 'POST',
      path: `/repos/${args.owner}/${args.repo}/pulls/${args.number}/reviews`,
      body: {
        event: args.event,
        ...(args.body ? { body: args.body } : {}),
        ...(args.commit_id ? { commit_id: args.commit_id } : {}),
        ...(Array.isArray(args.comments) && args.comments.length ? { comments: args.comments } : {}),
      },
    })
    return { id: result.id, url: result.html_url, state: result.state }
  },
})

export const githubActionsList = [
  githubSearchIssues,
  githubCreateIssue,
  githubCommentIssue,
  githubCreatePrReviewComment,
  githubCreatePrReview,
]
