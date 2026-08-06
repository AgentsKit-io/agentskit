import { describe, expect, it, vi } from 'vitest'
import { chroma } from '../src/vector/chroma'

type FetchCall = { url: string; init?: RequestInit }

function chromaFetch(operationResponse: unknown = {}) {
  const calls: FetchCall[] = []
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push({ url, init })
    const body = init?.method === 'GET' ? { id: 'collection-id' } : operationResponse
    return new Response(JSON.stringify(body), { status: 200 })
  })
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

describe('chroma v2', () => {
  it('resolves a collection name once and uses its id for v2 operations', async () => {
    const { fetch, calls } = chromaFetch({
      ids: [['doc-1']],
      documents: [['hello']],
      metadatas: [[{ topic: 'test' }]],
      distances: [[0.2]],
    })
    const store = chroma({ url: 'https://chroma.example/', collection: 'docs', fetch })

    await store.store([{ id: 'doc-1', content: 'hello', embedding: [0.1] }])
    const result = await store.search([0.1])
    await store.delete?.(['doc-1'])

    expect(calls.map(call => call.url)).toEqual([
      'https://chroma.example/api/v2/tenants/default_tenant/databases/default_database/collections/docs',
      'https://chroma.example/api/v2/tenants/default_tenant/databases/default_database/collections/collection-id/upsert',
      'https://chroma.example/api/v2/tenants/default_tenant/databases/default_database/collections/collection-id/query',
      'https://chroma.example/api/v2/tenants/default_tenant/databases/default_database/collections/collection-id/delete',
    ])
    expect(result[0]).toMatchObject({ id: 'doc-1', content: 'hello', score: 0.8 })
  })

  it('encodes custom tenant, database, collection name, and resolved collection id', async () => {
    const calls: FetchCall[] = []
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      calls.push({ url, init })
      const body = init?.method === 'GET' ? { id: 'id/with space' } : {}
      return new Response(JSON.stringify(body))
    }) as unknown as typeof globalThis.fetch
    const store = chroma({
      url: 'https://chroma.example',
      tenant: 'acme corp',
      database: 'support/prod',
      collection: 'customer docs',
      fetch,
    })

    await store.delete?.(['doc-1'])

    expect(calls[0]?.url).toBe(
      'https://chroma.example/api/v2/tenants/acme%20corp/databases/support%2Fprod/collections/customer%20docs',
    )
    expect(calls[1]?.url).toBe(
      'https://chroma.example/api/v2/tenants/acme%20corp/databases/support%2Fprod/collections/id%2Fwith%20space/delete',
    )
  })

  it('merges custom headers with token auth and JSON content type', async () => {
    const { fetch, calls } = chromaFetch()
    const store = chroma({
      url: 'https://chroma.example',
      collection: 'docs',
      apiKey: 'secret-token',
      headers: {
        'x-tenant-header': 'tenant-value',
        'Content-Type': 'text/plain',
        'X-Chroma-Token': 'stale-token',
      },
      fetch,
    })

    await store.store([{ id: 'doc-1', content: 'hello', embedding: [0.1] }])

    const resolutionHeaders = new Headers(calls[0]?.init?.headers)
    const operationHeaders = new Headers(calls[1]?.init?.headers)
    expect(resolutionHeaders.get('x-tenant-header')).toBe('tenant-value')
    expect(resolutionHeaders.get('x-chroma-token')).toBe('secret-token')
    expect(resolutionHeaders.get('content-type')).toBe('application/json')
    expect([...operationHeaders.entries()]).toEqual([...resolutionHeaders.entries()])
  })

  it('surfaces collection resolution failures as Chroma HTTP errors', async () => {
    const fetch = vi.fn(async () => new Response('missing', { status: 404 })) as unknown as typeof globalThis.fetch
    const store = chroma({ url: 'https://chroma.example', collection: 'missing', fetch })

    await expect(store.search([0.1])).rejects.toThrow(/chroma 404: missing/)
  })

  it('rejects a collection response without an id', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ name: 'docs' }))) as unknown as typeof globalThis.fetch
    const store = chroma({ url: 'https://chroma.example', collection: 'docs', fetch })

    await expect(store.search([0.1])).rejects.toThrow(/collection response did not include an id/)
  })
})
