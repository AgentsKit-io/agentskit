import type { ToolDefinition } from '@agentskit/core'
import { sentryIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/sentry). */
export interface SentryConfig extends HttpToolOptions {
  /** Sentry auth token (User Auth Token). */
  authToken: string
  /** Org slug. Required for most endpoints. */
  organization: string
}

function cfg(config: SentryConfig): ProjectionConfig {
  return {
    credential: config.authToken,
    config: { organization: config.organization },
    baseUrl: config.baseUrl,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function sentrySearchIssues(config: SentryConfig): ToolDefinition {
  return toToolDefinitions(sentryIntegration, cfg(config)).find((t) => t.name === 'sentry_search_issues')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function sentryResolveIssue(config: SentryConfig): ToolDefinition {
  return toToolDefinitions(sentryIntegration, cfg(config)).find((t) => t.name === 'sentry_resolve_issue')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function sentry(config: SentryConfig): ToolDefinition[] {
  return toToolDefinitions(sentryIntegration, cfg(config))
}
