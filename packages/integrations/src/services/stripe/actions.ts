import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

export interface StripeRuntimeConfig {
  apiKey: string
  baseUrl?: string
}

function form(params: Record<string, unknown>): string {
  const out = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    out.append(key, String(value))
  }
  return out.toString()
}

async function postForm<TResult>(
  cfg: StripeRuntimeConfig,
  fetchImpl: typeof globalThis.fetch,
  path: string,
  params: Record<string, unknown>,
): Promise<TResult> {
  const base = cfg.baseUrl ?? 'https://api.stripe.com/v1'
  const url = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`)
  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form(params),
  })
  const text = await response.text()
  const parsed = text.length > 0 ? (JSON.parse(text) as TResult) : ({} as TResult)
  if (!response.ok) {
    const err = parsed as { error?: { message?: string } }
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `stripe ${response.status}: ${err?.error?.message ?? text.slice(0, 200)}`,
      hint: `URL ${url.toString()}.`,
    })
  }
  return parsed
}

export const stripeCreateCustomer = defineAction({
  name: 'stripe_create_customer',
  description: 'Create a Stripe customer.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: { email: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' } },
  },
  async execute(args, { fetch, config }) {
    const result = await postForm<{ id: string }>(config as StripeRuntimeConfig, fetch, '/customers', args)
    return { id: result.id }
  },
})

export const stripeCreatePaymentIntent = defineAction({
  name: 'stripe_create_payment_intent',
  description: 'Create a Stripe payment intent.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount in smallest currency unit (cents).' },
      currency: { type: 'string' },
      customer: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['amount', 'currency'],
  },
  async execute(args, { fetch, config }) {
    const result = await postForm<{ id: string; client_secret: string; status: string }>(config as StripeRuntimeConfig, fetch, '/payment_intents', args)
    return { id: result.id, client_secret: result.client_secret, status: result.status }
  },
})

export const stripeActions = [stripeCreateCustomer, stripeCreatePaymentIntent]
