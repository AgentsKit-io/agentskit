import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface StripeConfig extends HttpToolOptions {
  apiKey: string
}

function opts(config: StripeConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.stripe.com/v1',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/x-www-form-urlencoded',
      ...config.headers,
    },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

// Stripe uses form-encoded bodies. We bypass the default JSON encoding
// by passing a prebuilt string through `body`.
function form(params: Record<string, unknown>): string {
  const out = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    out.append(key, String(value))
  }
  return out.toString()
}

async function postForm<TResult>(base: HttpToolOptions, path: string, params: Record<string, unknown>): Promise<TResult> {
  const fetchImpl = base.fetch ?? globalThis.fetch
  const url = new URL(path, base.baseUrl ?? '')
  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: base.headers,
    body: form(params),
  })
  const text = await response.text()
  const parsed = text.length > 0 ? (JSON.parse(text) as TResult) : ({} as TResult)
  if (!response.ok) {
    const err = parsed as { error?: { message?: string } }
    throw new Error(`stripe ${response.status}: ${err?.error?.message ?? text.slice(0, 200)}`)
  }
  return parsed
}

export function stripeCreateCustomer(config: StripeConfig) {
  const base = opts(config)
  return defineTool({
    name: 'stripe_create_customer',
    description: 'Create a Stripe customer.',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
    } as const,
    async execute(args) {
      const result = await postForm<{ id: string }>(base, '/customers', args)
      return { id: result.id }
    },
  })
}

export function stripeCreatePaymentIntent(config: StripeConfig) {
  const base = opts(config)
  return defineTool({
    name: 'stripe_create_payment_intent',
    description: 'Create a Stripe payment intent.',
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in smallest currency unit (cents).' },
        currency: { type: 'string' },
        customer: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['amount', 'currency'],
    } as const,
    async execute(args) {
      const result = await postForm<{ id: string; client_secret: string; status: string }>(
        base,
        '/payment_intents',
        args,
      )
      return { id: result.id, client_secret: result.client_secret, status: result.status }
    },
  })
}

export function stripe(config: StripeConfig) {
  return [stripeCreateCustomer(config), stripeCreatePaymentIntent(config)]
}
