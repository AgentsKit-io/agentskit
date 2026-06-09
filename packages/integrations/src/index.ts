// @agentskit/integrations — unified service-integration catalog.
//
// One descriptor per service (Integration), projected by each consumer layer
// into agent tools, connector senders, inbound triggers, and OAuth specs.
// The catalog itself is dependency-light (fetch + node:crypto only).

export type {
  Integration,
  IntegrationAction,
  IntegrationActionContext,
  IntegrationTrigger,
  AuthSpec,
  OAuth2AuthSpec,
  ApiKeyAuthSpec,
  WebhookSecretAuthSpec,
  NoAuthSpec,
  SideEffect,
  WebhookInput,
  VerifyResult,
  NormalizedEvent,
  ExternalThreadRef,
} from './contract'
export { defineIntegration, defineAction, defineTrigger } from './contract'

export type { HttpToolOptions, HttpJsonRequest, IntegrationHttp } from './http'
export { httpJson, bindHttp } from './http'

export type { IntegrationRegistry } from './registry'
export {
  createRegistry,
  registerIntegration,
  getIntegration,
  listIntegrations,
  integrationsByCategory,
} from './registry'

// Side-effect import: registers every catalog service into the default
// registry. Empty until services land in the move/add phases.
export type { ProjectionConfig } from './project/to-tool-definitions'
export {
  toToolDefinitions,
  actionToToolDefinition,
  httpOptionsFor,
} from './project/to-tool-definitions'
export {
  integrationTools,
  integrationToolsFromEnv,
  credentialEnvVar,
} from './project/integration-tools'

// Re-export every catalog service descriptor (and run their side-effect
// registration into the default registry).
export * from './services'
