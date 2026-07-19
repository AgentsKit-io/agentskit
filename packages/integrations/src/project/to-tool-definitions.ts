import type { ToolDefinition } from '@agentskit/core'
import type { Integration, IntegrationAction, AuthSpec } from '../contract'
import { bindHttp, type HttpToolOptions } from '../http'
import type { IntegrationActionContext } from '../contract'

/** Per-call config for projecting a descriptor into legacy ToolDefinitions. */
export interface ProjectionConfig {
  /** The auth credential (API key / OAuth access token). */
  credential?: string
  /** Service-specific config passed through to `ctx.config`. */
  config?: unknown
  baseUrl?: string
  headers?: Record<string, string>
  timeoutMs?: number
  signal?: AbortSignal
  fetch?: typeof globalThis.fetch
  /** Policy-enforcing fetch for model-controlled URLs; propagated to action context. */
  fetchUntrusted?: typeof globalThis.fetch
}

function authHeaders(auth: AuthSpec, credential: string): Record<string, string> {
  if (auth.kind === 'apiKey') {
    return { [auth.header]: `${auth.prefix ?? ''}${credential}` }
  }
  if (auth.kind === 'oauth2') {
    return credential ? { authorization: `Bearer ${credential}` } : {}
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
    signal: config.signal,
    fetch: config.fetch,
  }
}

function requiresConfirmationFor(action: IntegrationAction): boolean | undefined {
  const sideEffect = action.sideEffect
  if (sideEffect === 'write' || sideEffect === 'external' || sideEffect === 'destructive') {
    return true
  }
  return action.requiresConfirmation
}

/** Project a single action into a ToolDefinition bound to `http`. */
export function actionToToolDefinition(action: IntegrationAction, ctx: IntegrationActionContext): ToolDefinition {
  return {
    name: action.name,
    description: action.description,
    schema: action.schema,
    requiresConfirmation: requiresConfirmationFor(action),
    execute: (args) => action.execute(args, ctx),
  }
}

/** Project every action of a descriptor into ToolDefinitions (legacy tool API). */
export function toToolDefinitions(integration: Integration, config: ProjectionConfig = {}): ToolDefinition[] {
  const http = bindHttp(httpOptionsFor(integration, config))
  const ctx: IntegrationActionContext = {
    http,
    fetch: config.fetch ?? globalThis.fetch,
    fetchUntrusted: config.fetchUntrusted,
    config: config.config,
  }
  return integration.actions.map((a) => actionToToolDefinition(a, ctx))
}
