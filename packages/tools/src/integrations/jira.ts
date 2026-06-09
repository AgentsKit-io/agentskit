import type { ToolDefinition } from '@agentskit/core'
import { jiraIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/jira). */
export interface JiraConfig extends HttpToolOptions {
  /** Atlassian site root, e.g. `https://my-org.atlassian.net`. */
  baseUrl: string
  /** Atlassian account email. */
  email: string
  /** Atlassian API token (NOT a password). */
  apiToken: string
}

function cfg(config: JiraConfig): ProjectionConfig {
  const auth = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`
  return {
    baseUrl: config.baseUrl,
    headers: { authorization: auth, ...config.headers },
    config: { baseUrl: config.baseUrl },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function jiraSearchIssues(config: JiraConfig): ToolDefinition {
  return toToolDefinitions(jiraIntegration, cfg(config)).find((t) => t.name === 'jira_search_issues')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function jiraCreateIssue(config: JiraConfig): ToolDefinition {
  return toToolDefinitions(jiraIntegration, cfg(config)).find((t) => t.name === 'jira_create_issue')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function jira(config: JiraConfig): ToolDefinition[] {
  return toToolDefinitions(jiraIntegration, cfg(config))
}
