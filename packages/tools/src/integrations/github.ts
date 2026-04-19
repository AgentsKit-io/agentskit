import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface GitHubConfig extends HttpToolOptions {
  token: string
}

function opts(config: GitHubConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.github.com',
    headers: {
      authorization: `Bearer ${config.token}`,
      'user-agent': 'agentskit-github-tool',
      accept: 'application/vnd.github+json',
      ...config.headers,
    },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** Search issues + pull requests. */
export function githubSearchIssues(config: GitHubConfig) {
  const base = opts(config)
  return defineTool({
    name: 'github_search_issues',
    description: 'Search GitHub issues and pull requests by query.',
    schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'GitHub search query, e.g. "repo:owner/name is:open label:bug"' },
        per_page: { type: 'number', description: 'Results per page (default 10)' },
      },
      required: ['q'],
    } as const,
    async execute({ q, per_page }) {
      const result = await httpJson<{ items: Array<{ number: number; title: string; html_url: string; state: string }> }>(
        base,
        { path: '/search/issues', query: { q, per_page: per_page ?? 10 } },
      )
      return result.items.map(i => ({ number: i.number, title: i.title, url: i.html_url, state: i.state }))
    },
  })
}

/** Create an issue. */
export function githubCreateIssue(config: GitHubConfig) {
  const base = opts(config)
  return defineTool({
    name: 'github_create_issue',
    description: 'Open a new GitHub issue on a repository.',
    schema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['owner', 'repo', 'title'],
    } as const,
    async execute({ owner, repo, title, body }) {
      const result = await httpJson<{ number: number; html_url: string }>(base, {
        method: 'POST',
        path: `/repos/${owner}/${repo}/issues`,
        body: { title, body: body ?? '' },
      })
      return { number: result.number, url: result.html_url }
    },
  })
}

/** Comment on an issue. */
export function githubCommentIssue(config: GitHubConfig) {
  const base = opts(config)
  return defineTool({
    name: 'github_comment_issue',
    description: 'Comment on an existing GitHub issue.',
    schema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        number: { type: 'number' },
        body: { type: 'string' },
      },
      required: ['owner', 'repo', 'number', 'body'],
    } as const,
    async execute({ owner, repo, number, body }) {
      const result = await httpJson<{ id: number; html_url: string }>(base, {
        method: 'POST',
        path: `/repos/${owner}/${repo}/issues/${number}/comments`,
        body: { body },
      })
      return { id: result.id, url: result.html_url }
    },
  })
}

/** Bundle all GitHub tools. */
export function github(config: GitHubConfig) {
  return [githubSearchIssues(config), githubCreateIssue(config), githubCommentIssue(config)]
}
