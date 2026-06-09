import { ErrorCodes, ToolError, type ToolDefinition } from '@agentskit/core'
import { verifyStripeSignature } from '@agentskit/integrations'

export { verifyStripeSignature } from '@agentskit/integrations'

/** @deprecated Moved to `@agentskit/integrations` (services/stripe — webhook trigger). */
export interface StripeWebhookConfig {
  /** Endpoint signing secret from the Stripe dashboard (`whsec_...`). */
  secret: string
  /** Tolerance for the t= timestamp, in seconds. Defaults to 300 (5 min). */
  toleranceSeconds?: number
}

interface StripeEvent {
  id: string
  type: string
  created: number
  data: { object: Record<string, unknown> }
}

/**
 * @deprecated Verify a Stripe webhook signature and return the parsed event.
 * The catalog now models this as the `stripe.event` trigger on the stripe
 * integration; this shim preserves the legacy tool form.
 */
export function stripeWebhookTool(config: StripeWebhookConfig): ToolDefinition {
  const tolerance = config.toleranceSeconds ?? 300
  return {
    name: 'stripe_webhook_verify',
    description: 'Verify a Stripe webhook signature and return the parsed event. Throws on invalid signature or expired timestamp.',
    schema: {
      type: 'object',
      properties: {
        payload: { type: 'string', description: 'Raw request body as received (string, not JSON-parsed).' },
        signature: { type: 'string', description: 'Value of the Stripe-Signature header.' },
      },
      required: ['payload', 'signature'],
    },
    async execute(args) {
      const ok = verifyStripeSignature(String(args.payload), String(args.signature), config.secret, tolerance)
      if (!ok) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'stripe: webhook signature verification failed',
          hint: 'Check secret matches the endpoint and that the raw body is unparsed.',
        })
      }
      const event = JSON.parse(String(args.payload)) as StripeEvent
      return { id: event.id, type: event.type, created: event.created, object: event.data.object }
    },
  }
}
