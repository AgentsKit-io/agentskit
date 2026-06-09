import type { ToolDefinition } from '@agentskit/core'
import { stripeIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/stripe). */
export interface StripeConfig extends HttpToolOptions {
  apiKey: string
}

function cfg(config: StripeConfig): ProjectionConfig {
  return { config: { apiKey: config.apiKey, baseUrl: config.baseUrl }, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function stripeCreateCustomer(config: StripeConfig): ToolDefinition {
  return toToolDefinitions(stripeIntegration, cfg(config)).find((t) => t.name === 'stripe_create_customer')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function stripeCreatePaymentIntent(config: StripeConfig): ToolDefinition {
  return toToolDefinitions(stripeIntegration, cfg(config)).find((t) => t.name === 'stripe_create_payment_intent')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function stripe(config: StripeConfig): ToolDefinition[] {
  return toToolDefinitions(stripeIntegration, cfg(config))
}
