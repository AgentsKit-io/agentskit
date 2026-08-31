import type { ToolDefinition } from '@agentskit/core'
import type { Integration, IntegrationAction, AuthSpec } from '../contract'
import { bindHttp, composeTimeoutSignal, type HttpToolOptions } from '../http'
import type { IntegrationActionContext } from '../contract'
import type { RetryPolicy } from '../http'

/** Per-call config for projecting a descriptor into legacy ToolDefinitions. */
export interface ProjectionConfig {
  /** The auth credential (API key / OAuth access token). */
  credential?: string
  /** Service-specific config passed through to `ctx.config`. */
  config?: unknown
  baseUrl?: string
  headers?: Record<string, string>
  timeoutMs?: number
  retry?: RetryPolicy
  sleep?: (delayMs: number) => Promise<void>
  now?: () => number
  maxResponseBytes?: number
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
    retry: config.retry,
    sleep: config.sleep,
    now: config.now,
    signal: config.signal,
    fetch: config.fetch,
    maxResponseBytes: config.maxResponseBytes,
  }
}

function boundedFetch(
  fetchImpl: typeof globalThis.fetch,
  timeoutMs: number,
): typeof globalThis.fetch {
  return async (input, init = {}) => {
    const { signal, cleanup } = composeTimeoutSignal(timeoutMs, init.signal ?? undefined)
    try {
      const request = fetchImpl(input, { ...init, signal })
      const timeout = new Promise<never>((_, reject) => {
        if (signal.aborted) reject(signal.reason)
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
      return await Promise.race([request, timeout])
    } finally {
      cleanup()
    }
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
  const timeoutMs = config.timeoutMs ?? 20_000
  const fetch = boundedFetch(config.fetch ?? globalThis.fetch, timeoutMs)
  const fetchUntrusted = config.fetchUntrusted ? boundedFetch(config.fetchUntrusted, timeoutMs) : undefined
  const http = bindHttp(httpOptionsFor(integration, config))
  const ctx: IntegrationActionContext = {
    http,
    fetch,
    fetchUntrusted,
    signal: config.signal,
    config: config.config,
  }
  return integration.actions.map((a) => actionToToolDefinition(a, ctx))
}
