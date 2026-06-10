import { describe, it, expect } from 'vitest'
import { whatsappIntegration } from '../src/services/whatsapp/index'
import { bigcommerceIntegration } from '../src/services/bigcommerce/index'
import { salesforceIntegration } from '../src/services/salesforce/index'
import { azureOpenaiIntegration } from '../src/services/azure-openai/index'
import { mailchimpIntegration } from '../src/services/mailchimp/index'
import { acuityIntegration } from '../src/services/acuity/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('whatsapp', () => {
  it('valid + send text (Bearer, phone id in path)', async () => {
    expect(() => assertValidIntegration(whatsappIntegration)).not.toThrow()
    let url = ''; let auth = ''
    const fetch = fakeFetch((u, init) => { url = u; auth = String((init.headers as Record<string,string>).authorization); return json({ messages: [{ id: 'wamid.1' }] }) })
    const [send] = toToolDefinitions(whatsappIntegration, { credential: 'EAAB', config: { phoneNumberId: '12345' }, fetch })
    expect(await run(send, { to: '15551234', text: 'hi' })).toEqual({ messageId: 'wamid.1' })
    expect(url).toContain('/12345/messages'); expect(auth).toBe('Bearer EAAB')
  })
})

describe('bigcommerce', () => {
  it('valid + X-Auth-Token + store hash in path', async () => {
    expect(() => assertValidIntegration(bigcommerceIntegration)).not.toThrow()
    let url = ''; let tok = ''
    const fetch = fakeFetch((u, init) => { url = u; tok = String((init.headers as Record<string,string>)['x-auth-token']); return u.includes('/v2/orders') ? json([{ id: 1, status: 'Shipped', total_inc_tax: '10', date_created: 'd' }]) : json({ data: [{ id: 1, name: 'P', sku: 'S', price: 9 }] }) })
    const tools = toToolDefinitions(bigcommerceIntegration, { credential: 'tk', config: { storeHash: 'abc' }, fetch })
    expect(((await run(tools.find(t=>t.name==='bigcommerce_list_products')!, {})) as unknown[]).length).toBe(1)
    expect(url).toContain('/stores/abc/v3/catalog/products'); expect(tok).toBe('tk')
    expect(((await run(tools.find(t=>t.name==='bigcommerce_list_orders')!, {})) as unknown[]).length).toBe(1)
  })
})

describe('salesforce', () => {
  it('valid + SOQL/create against caller instance URL (Bearer)', async () => {
    expect(() => assertValidIntegration(salesforceIntegration)).not.toThrow()
    let url = ''; let auth = ''
    const fetch = fakeFetch((u, init) => { url = u; auth = String((init.headers as Record<string,string>).authorization); return init.method === 'POST' ? json({ id: '001x', success: true }) : json({ totalSize: 1, records: [{ Id: '001x', Name: 'Acme' }] }) })
    const tools = toToolDefinitions(salesforceIntegration, { credential: 'tok', baseUrl: 'https://my.my.salesforce.com', fetch })
    expect((await run(tools.find(t=>t.name==='salesforce_query')!, { soql: 'SELECT Id FROM Account' }) as { totalSize: number }).totalSize).toBe(1)
    expect(url).toContain('my.my.salesforce.com/services/data/v60.0/query'); expect(auth).toBe('Bearer tok')
    expect(await run(tools.find(t=>t.name==='salesforce_create_record')!, { sobject: 'Account', fields: { Name: 'X' } })).toEqual({ id: '001x', success: true })
  })
})

describe('azure-openai', () => {
  it('valid + api-key header + deployment in path + api-version', async () => {
    expect(() => assertValidIntegration(azureOpenaiIntegration)).not.toThrow()
    let url = ''; let key = ''
    const fetch = fakeFetch((u, init) => { url = u; key = String((init.headers as Record<string,string>)['api-key']); return json({ choices: [{ message: { role: 'assistant', content: 'hi' } }], usage: { total_tokens: 5 } }) })
    const [chat] = toToolDefinitions(azureOpenaiIntegration, { credential: 'azk', baseUrl: 'https://res.openai.azure.com', config: { deployment: 'gpt4o' }, fetch })
    const out = await run(chat, { messages: [{ role: 'user', content: 'hi' }] }) as { message: { content: string } }
    expect(out.message.content).toBe('hi'); expect(key).toBe('azk')
    expect(url).toContain('/openai/deployments/gpt4o/chat/completions'); expect(url).toContain('api-version=2024-10-21')
  })
})

describe('mailchimp', () => {
  it('valid + Basic auth + datacenter base url', async () => {
    expect(() => assertValidIntegration(mailchimpIntegration)).not.toThrow()
    let url = ''; let auth = ''
    const fetch = fakeFetch((u, init) => { url = u; auth = String((init.headers as Record<string,string>).authorization); return u.endsWith('/lists') ? json({ lists: [{ id: 'l1', name: 'Main', stats: { member_count: 3 } }] }) : json({ id: 'm1', email_address: 'a@x.io', status: 'subscribed' }) })
    const tools = toToolDefinitions(mailchimpIntegration, { config: { apiKey: 'key-us21', dc: 'us21' }, fetch })
    expect(await run(tools.find(t=>t.name==='mailchimp_add_member')!, { list_id: 'l1', email: 'a@x.io' })).toEqual({ id: 'm1', email: 'a@x.io', status: 'subscribed' })
    expect(url).toContain('https://us21.api.mailchimp.com/3.0/'); expect(auth).toMatch(/^Basic /)
    expect(((await run(tools.find(t=>t.name==='mailchimp_list_audiences')!, {})) as unknown[]).length).toBe(1)
  })
})

describe('acuity', () => {
  it('valid + Basic userId:apiKey', async () => {
    expect(() => assertValidIntegration(acuityIntegration)).not.toThrow()
    let auth = ''
    const fetch = fakeFetch((u, init) => { auth = String((init.headers as Record<string,string>).authorization); return u.includes('appointment-types') ? json([{ id: 2, name: 'Intro', duration: 30, price: '0' }]) : json([{ id: 1, firstName: 'A', lastName: 'B', datetime: 'd', type: 'Intro' }]) })
    const tools = toToolDefinitions(acuityIntegration, { config: { userId: '123', apiKey: 'abc' }, fetch })
    expect(((await run(tools.find(t=>t.name==='acuity_list_appointments')!, {})) as unknown[]).length).toBe(1)
    expect(auth).toMatch(/^Basic /)
    expect(((await run(tools.find(t=>t.name==='acuity_list_appointment_types')!, {})) as unknown[]).length).toBe(1)
  })
})
