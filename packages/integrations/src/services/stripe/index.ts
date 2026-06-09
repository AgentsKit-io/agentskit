import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { stripeActions } from './actions'
import { stripeWebhook } from './webhook'

export const stripeIntegration = defineIntegration({
  name: 'stripe',
  displayName: 'Stripe',
  categories: ['commerce'],
  http: { baseUrl: 'https://api.stripe.com/v1' },
  // Bearer secret key built per-call from ctx.config (form-encoded transport).
  auth: { kind: 'none' },
  actions: stripeActions,
  triggers: [stripeWebhook],
  capabilities: { send: 'stripe_create_payment_intent' },
})

registerIntegration(stripeIntegration)

export { verifyStripeSignature, stripeWebhook } from './webhook'
