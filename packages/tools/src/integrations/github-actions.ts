import type { ToolDefinition } from '@agentskit/core'
import { githubActionsIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/github-actions). */
export interface GitHubActionsConfig extends HttpToolOptions {
  token: string
  /** Default `owner/repo` if omitted from per-call args. */
  defaultRepo?: string
}

function cfg(config: GitHubActionsConfig): ProjectionConfig {
  return {
    credential: config.token,
    config: { defaultRepo: config.defaultRepo },
    baseUrl: config.baseUrl,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function githubActionsListRuns(config: GitHubActionsConfig): ToolDefinition {
  return toToolDefinitions(githubActionsIntegration, cfg(config)).find((t) => t.name === 'github_actions_list_runs')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function githubActionsDispatch(config: GitHubActionsConfig): ToolDefinition {
  return toToolDefinitions(githubActionsIntegration, cfg(config)).find((t) => t.name === 'github_actions_dispatch')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function githubActions(config: GitHubActionsConfig): ToolDefinition[] {
  return toToolDefinitions(githubActionsIntegration, cfg(config))
}
