import type { ToolDefinition } from '@agentskit/core'
import type { Integration, IntegrationAction, AuthSpec } from '../contract'
import { bindHttp, type HttpToolOptions, type IntegrationHttp } from '../http'

/** Per-call config for projecting a descriptor into legacy ToolDefinitions. */
export interface ProjectionConfig {
  /** The auth credential (API key / token) for `apiKey` auth. */
  credential?: string
  baseUrl?: string
  headers?: Record<string, string>
  timeoutMs?: number
  fetch?: typeof globalThis.fetch
}

function authHeaders(auth: AuthSpec, credential: string): Record<string, string> {
  if (auth.kind === 'apiKey') {
    return { [auth.header]: `${auth.prefix ?? ''}${credential}` }
  }
  return {}
}

/** Build the auth-bound HTTP options for a descriptor + caller config. */
export function httpOptionsFor(integration: Integration, config: ProjectionConfig = {}): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? integration.http?.baseUrl,
    headers: {
      ...integration.http?.headers,
      ...authHeaders(integration.auth, config.credential ?? ''),
      ...config.headers,
    },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** Project a single action into a ToolDefinition bound to `http`. */
export function actionToToolDefinition(action: IntegrationAction, http: IntegrationHttp): ToolDefinition {
  return {
    name: action.name,
    description: action.description,
    schema: action.schema,
    execute: (args) => action.execute(args, http),
  }
}

/** Project every action of a descriptor into ToolDefinitions (legacy tool API). */
export function toToolDefinitions(integration: Integration, config: ProjectionConfig = {}): ToolDefinition[] {
  const http = bindHttp(httpOptionsFor(integration, config))
  return integration.actions.map((a) => actionToToolDefinition(a, http))
}
