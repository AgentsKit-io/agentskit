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
  OAuth2ProviderSpec,
  ApiKeyAuthSpec,
  WebhookSecretAuthSpec,
  NoAuthSpec,
  ConfigField,
  SideEffect,
  WebhookInput,
  VerifyResult,
  NormalizedEvent,
  ExternalThreadRef,
} from './contract'
export { defineIntegration, defineAction, defineTrigger } from './contract'
export { CONFIG_FIELDS } from './config-fields'

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

// Projection helpers (toToolDefinitions binds auth + propagates signal /
// fetchUntrusted). Catalog services are re-exported below and register into
// the default registry via side effects.
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
