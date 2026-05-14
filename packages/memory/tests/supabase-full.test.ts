/**
 * Full supabase vector store tests with injected fake SDK.
 * Covers: store, search, delete, error path (RPC error).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.resetModules()
})

function makeFakeSupabaseClient() {
  const rows: Array<{ id: string; content: string; metadata: Record<string, unknown> | null; distance: number }> = []

  const rpc = vi.fn(async (_fn: string, params: { sql: string; params: unknown[] }) => {
    const sql = (params.sql ?? '').toUpperCase()

    if (sql.includes('INSERT INTO') || sql.includes('ON CONFLICT')) {
      return { data: [], error: null }
    }

    if (sql.includes('DELETE FROM')) {
      return { data: [], error: null }
    }

    // SELECT (search)
    return { data: rows, error: null }
  })

  return { rpc, rows }
}

describe('supabaseVectorStore (injected fake SDK)', () => {
  it('store + search round-trip via pgvector runner', async () => {
    const { rpc, rows } = makeFakeSupabaseClient()
    // Prime the fake rows so search returns something
    rows.push({ id: 'doc-1', content: 'hello supabase', metadata: null, distance: 0.1 })

    const fakeClient = { rpc }
    const fakeSdk = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@supabase/supabase-js', () => fakeSdk)

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })

    // store triggers an INSERT via RPC
    await store.store([{ id: 'doc-1', content: 'hello supabase', embedding: [0.1, 0.2] }])
    expect(rpc).toHaveBeenCalled()

    // search triggers a SELECT via RPC
    const results = await store.search([0.1, 0.2])
    expect(results[0]).toMatchObject({ id: 'doc-1', content: 'hello supabase' })
    expect(results[0]!.score).toBeCloseTo(0.9, 5)
  })

  it('delete delegates to pgvector runner DELETE', async () => {
    const { rpc } = makeFakeSupabaseClient()
    const fakeClient = { rpc }
    const fakeSdk = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@supabase/supabase-js', () => fakeSdk)

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })
    await store.delete!(['id1', 'id2'])
    // Should have called RPC (DELETE query)
    expect(rpc).toHaveBeenCalled()
  })

  it('throws MemoryError when RPC returns error', async () => {
    const fakeClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }),
    }
    const fakeSdk = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@supabase/supabase-js', () => fakeSdk)

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })
    await expect(store.store([{ id: 'a', content: 'x', embedding: [1] }])).rejects.toThrow(
      /supabase: permission denied/,
    )
  })

  it('createClient is called with url + serviceRoleKey', async () => {
    const { rpc } = makeFakeSupabaseClient()
    const fakeClient = { rpc }
    const fakeSdk = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('@supabase/supabase-js', () => fakeSdk)

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({
      url: 'https://proj.supabase.co',
      serviceRoleKey: 'my-secret-key',
    })
    await store.search([1, 2])
    expect(fakeSdk.createClient).toHaveBeenCalledWith('https://proj.supabase.co', 'my-secret-key')
  })
})
