import type { JSONSchema7 } from 'json-schema'
import type { MaybePromise } from '@agentskit/core'
import type { IntegrationHttp } from './http'

// ---------------------------------------------------------------------------
// Side effects — drives the OS autonomy gate when projected into AgentskitTool.
// ---------------------------------------------------------------------------

export type SideEffect = 'none' | 'read' | 'write' | 'destructive' | 'external'

// ---------------------------------------------------------------------------
// Auth — one declarative spec per service. `oauth2` mirrors the OS
// OAuthProviderSpec verbatim so it projects with zero translation.
// ---------------------------------------------------------------------------

export interface OAuth2AuthSpec {
  kind: 'oauth2'
  authorizationUrl: string
  tokenUrl: string
  defaultScopes: string[]
  usePkce: boolean
  /** Non-standard authorize params (e.g. Dropbox `token_access_type=offline`). */
  extraAuthParams?: Record<string, string>
}

export interface ApiKeyAuthSpec {
  kind: 'apiKey'
  /** Header the credential is sent in (e.g. `authorization`). */
  header: string
  /** Optional prefix, e.g. `Bearer ` or `token `. */
  prefix?: string
  /** Hint for where the key is conventionally read from (docs/UX only). */
  envHint?: string
}

export interface WebhookSecretAuthSpec {
  kind: 'webhookSecret'
  /** Signature scheme used to verify inbound webhooks. */
  scheme: 'hmac-sha256' | 'ed25519' | 'custom'
}

export interface NoAuthSpec {
  kind: 'none'
}

export type AuthSpec =
  | OAuth2AuthSpec
  | ApiKeyAuthSpec
  | WebhookSecretAuthSpec
  | NoAuthSpec

// ---------------------------------------------------------------------------
// Actions — the single source for agent tools, connector senders, and
// notification channels. `execute` receives an auth-bound HTTP client and
// never sees the raw credential.
// ---------------------------------------------------------------------------

export interface IntegrationAction {
  /** Stable, namespaced id, e.g. `slack_post_message`. */
  name: string
  description: string
  /** JSON Schema (canonical) for the action arguments. */
  schema: JSONSchema7
  sideEffect?: SideEffect
  /**
   * SendCapability id this action fulfils when projected as an outbound
   * connector sender (e.g. `chat.postMessage`). Absent = not a sender.
   */
  sendCapability?: string
  execute: (args: Record<string, unknown>, http: IntegrationHttp) => MaybePromise<unknown>
}

// ---------------------------------------------------------------------------
// Triggers — the single source for inbound webhook verification + the
// canonical normalized event (projected into the OS IncomingEvent).
// ---------------------------------------------------------------------------

export interface WebhookInput {
  /** Verification secret (signing secret / shared token). */
  secret: string
  /** Raw, unparsed request body — required for signature verification. */
  rawBody: string
  headers: Record<string, string>
  /** Override for replay-window checks; defaults to now. */
  nowSeconds?: number
  requestUrl?: string
}

export type VerifyResult = { ok: true } | { ok: false; reason: string }

/** External thread reference — basis for session stitching across turns. */
export interface ExternalThreadRef {
  kind: string
  id: string
  parentId?: string
}

/** Provider payload normalized to a uniform shape before canonicalization. */
export interface NormalizedEvent {
  /** Provider event type, e.g. `message`, `issues.opened`. */
  kind: string
  payload: unknown
  /** Untouched provider envelope, kept for replay/debug. */
  raw?: unknown
}

export interface IntegrationTrigger {
  /** Stable id, e.g. `slack.message`. */
  name: string
  /** Canonical source slug — matches the OS IncomingEvent `source`. */
  source: string
  /** Verify inbound signature. Omit only for unauthenticated sources. */
  verify?: (input: WebhookInput) => VerifyResult
  /** Normalize a raw provider payload into a uniform event. */
  normalize: (raw: unknown) => NormalizedEvent
  /** Extract a thread reference for session stitching, when available. */
  externalThreadRef?: (raw: unknown) => ExternalThreadRef | undefined
}

// ---------------------------------------------------------------------------
// Integration — one descriptor per service. Every consumer layer projects
// from this single definition.
// ---------------------------------------------------------------------------

export interface Integration {
  /** Service slug — matches the OS ConnectionKind, e.g. `slack`. */
  name: string
  displayName: string
  categories: string[]
  /** Shared transport facts (base URL) applied to every action. */
  http?: { baseUrl: string }
  auth: AuthSpec
  actions: IntegrationAction[]
  triggers?: IntegrationTrigger[]
  /** Pointers letting projections pick the canonical send/notify action. */
  capabilities?: {
    /** Action name used as the canonical outbound sender. */
    send?: string
    /** Action name used as the canonical notification channel. */
    notify?: string
  }
}

// ---------------------------------------------------------------------------
// Authoring helpers — identity casts that anchor types at definition sites.
// ---------------------------------------------------------------------------

/** Define an integration descriptor (identity; anchors the type). */
export function defineIntegration(integration: Integration): Integration {
  return integration
}

/** Define a single action (identity; anchors the type). */
export function defineAction(action: IntegrationAction): IntegrationAction {
  return action
}

/** Define a single trigger (identity; anchors the type). */
export function defineTrigger(trigger: IntegrationTrigger): IntegrationTrigger {
  return trigger
}
