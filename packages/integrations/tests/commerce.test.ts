import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { hubspotIntegration } from '../src/services/hubspot/index'
import { shopifyIntegration } from '../src/services/shopify/index'
import { stripeIntegration } from '../src/services/stripe/index'
import { stripeWebhook, verifyStripeSignature } from '../src/services/stripe/webhook'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

describe('hubspot', () => {
  it('valid + search/create deal', async () => {
    expect(() => assertValidIntegration(hubspotIntegration)).not.toThrow()
    const fetch = fakeFetch((u) => u.includes('/search') ? json({ results: [{ id: 'c1', properties: { email: 'a@x.io', firstname: 'A', lastname: 'B', company: 'X' } }] }) : json({ id: 'd1' }))
    const tools = toToolDefinitions(hubspotIntegration, { credential: 'tok', fetch })
    expect(await run(tools.find((t) => t.name === 'hubspot_search_contacts')!, { query: 'a@x.io' })).toEqual([{ id: 'c1', email: 'a@x.io', name: 'A B', company: 'X' }])
    expect(await run(tools.find((t) => t.name === 'hubspot_create_deal')!, { dealname: 'D', amount: 100, contactId: 'c1' })).toEqual({ id: 'd1' })
  })
})

describe('shopify', () => {
  it('valid + per-shop url + products/orders', async () => {
    expect(() => assertValidIntegration(shopifyIntegration)).not.toThrow()
    let url = ''; let tok = ''
    const fetch = fakeFetch((u, init) => {
      url = u; tok = String((init.headers as Record<string, string>)['x-shopify-access-token'] ?? '')
      return u.includes('orders') ? json({ orders: [{ id: 1, name: '#1', email: 'a@x.io', total_price: '10', financial_status: 'paid', fulfillment_status: null, created_at: 'd' }] }) : json({ products: [{ id: 1, title: 'P', vendor: 'V', status: 'active' }] })
    })
    const tools = toToolDefinitions(shopifyIntegration, { credential: 'sk', baseUrl: 'https://store.myshopify.com/admin/api/2024-10/', fetch })
    expect(((await run(tools.find((t) => t.name === 'shopify_search_products')!, {})) as unknown[]).length).toBe(1)
    expect(tok).toBe('sk'); expect(url).toContain('/admin/api/2024-10/products.json')
    expect(((await run(tools.find((t) => t.name === 'shopify_list_orders')!, { status: 'any' })) as unknown[]).length).toBe(1)
  })
})

describe('stripe', () => {
  it('valid + form-encoded customer/payment-intent + Bearer', async () => {
    expect(() => assertValidIntegration(stripeIntegration)).not.toThrow()
    let body = ''; let auth = ''; let ct = ''
    const fetch = fakeFetch((u, init) => {
      body = String(init.body); auth = String((init.headers as Record<string, string>).authorization); ct = String((init.headers as Record<string, string>)['content-type'])
      return u.includes('payment_intents') ? json({ id: 'pi', client_secret: 'cs', status: 'requires_payment_method' }) : json({ id: 'cus' })
    })
    const tools = toToolDefinitions(stripeIntegration, { config: { apiKey: 'sk_test' }, fetch })
    expect(await run(tools.find((t) => t.name === 'stripe_create_customer')!, { email: 'a@x.io' })).toEqual({ id: 'cus' })
    expect(auth).toBe('Bearer sk_test'); expect(ct).toBe('application/x-www-form-urlencoded'); expect(body).toContain('email=a%40x.io')
    expect(await run(tools.find((t) => t.name === 'stripe_create_payment_intent')!, { amount: 500, currency: 'usd' })).toEqual({ id: 'pi', client_secret: 'cs', status: 'requires_payment_method' })
  })
  it('errors surface the Stripe message', async () => {
    const fetch = fakeFetch(() => json({ error: { message: 'No such customer' } }, 400))
    const [cust] = toToolDefinitions(stripeIntegration, { config: { apiKey: 'sk' }, fetch })
    await expect(run(cust, { email: 'x' })).rejects.toThrow(/No such customer/)
  })
})

describe('stripe webhook trigger', () => {
  const secret = 'whsec_test'
  function signed(payload: string, ts: number) {
    const sig = createHmac('sha256', secret).update(`${ts}.${payload}`, 'utf8').digest('hex')
    return `t=${ts},v1=${sig}`
  }
  it('verifies a valid signature and normalizes the event', () => {
    const payload = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded', created: 1700000000, data: { object: { id: 'pi_1' } } })
    const ts = 1700000000
    const header = signed(payload, ts)
    expect(stripeWebhook.verify!({ secret, rawBody: payload, headers: { 'stripe-signature': header }, nowSeconds: ts })).toEqual({ ok: true })
    const norm = stripeWebhook.normalize(payload)
    expect(norm.kind).toBe('payment_intent.succeeded')
    expect((norm.payload as { object: { id: string } }).object.id).toBe('pi_1')
  })
  it('rejects a bad signature', () => {
    const res = stripeWebhook.verify!({ secret, rawBody: '{}', headers: { 'stripe-signature': 't=1,v1=deadbeef' }, nowSeconds: 1 })
    expect(res.ok).toBe(false)
    expect(verifyStripeSignature('{}', 'garbage', secret)).toBe(false)
  })
})
