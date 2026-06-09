import type { ToolDefinition } from '@agentskit/core'
import { githubIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/github). */
export interface GitHubConfig extends HttpToolOptions {
  token: string
}

function cfg(config: GitHubConfig): ProjectionConfig {
  return {
    credential: config.token,
    baseUrl: config.baseUrl,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

function pick(config: GitHubConfig, name: string): ToolDefinition {
  return toToolDefinitions(githubIntegration, cfg(config)).find((t) => t.name === name)!
}

/** @deprecated import from `@agentskit/integrations`. */
export function githubSearchIssues(config: GitHubConfig): ToolDefinition {
  return pick(config, 'github_search_issues')
}
/** @deprecated import from `@agentskit/integrations`. */
export function githubCreateIssue(config: GitHubConfig): ToolDefinition {
  return pick(config, 'github_create_issue')
}
/** @deprecated import from `@agentskit/integrations`. */
export function githubCommentIssue(config: GitHubConfig): ToolDefinition {
  return pick(config, 'github_comment_issue')
}
/** @deprecated import from `@agentskit/integrations`. */
export function github(config: GitHubConfig): ToolDefinition[] {
  return toToolDefinitions(githubIntegration, cfg(config))
}
