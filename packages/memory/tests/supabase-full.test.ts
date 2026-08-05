import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
})

function makeFakeSupabaseClient() {
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null })
  const inFilter = vi.fn().mockResolvedValue({ data: null, error: null })
  const deleteRows = vi.fn(() => ({ in: inFilter }))
  const from = vi.fn(() => ({ upsert, delete: deleteRows }))
  const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
  return { client: { from, rpc }, from, upsert, deleteRows, inFilter, rpc }
}

describe('supabaseVectorStore', () => {
  it('uses direct upsert and delete operations without sending SQL through RPC', async () => {
    const fake = makeFakeSupabaseClient()
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => fake.client) }))

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })

    await store.store([{ id: 'doc-1', content: 'hello', embedding: [0.1, 0.2] }])
    await store.delete!(['doc-1'])

    expect(fake.from).toHaveBeenCalledTimes(2)
    expect(fake.from).toHaveBeenNthCalledWith(1, 'agentskit_vectors')
    expect(fake.upsert).toHaveBeenCalledWith(
      [{ id: 'doc-1', content: 'hello', embedding: [0.1, 0.2], metadata: {} }],
      { onConflict: 'id' },
    )
    expect(fake.deleteRows).toHaveBeenCalledOnce()
    expect(fake.inFilter).toHaveBeenCalledWith('id', ['doc-1'])
    expect(fake.rpc).not.toHaveBeenCalled()
  })

  it('uses the purpose-specific RPC and normalizes search results', async () => {
    const fake = makeFakeSupabaseClient()
    fake.rpc.mockResolvedValue({
      data: [
        { id: 'low', content: 'low', metadata: null, similarity: 0.4 },
        { id: 'high', content: 'high', metadata: { source: 'docs' }, similarity: 0.9 },
        { id: 'equal', content: 'equal', metadata: null, similarity: 0.5 },
      ],
      error: null,
    })
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => fake.client) }))

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })
    const results = await store.search([0.1, 0.2], {
      topK: 2,
      threshold: 0.5,
      filter: { source: 'docs' },
    })

    expect(fake.rpc).toHaveBeenCalledWith('match_agentskit_vectors', {
      query_embedding: [0.1, 0.2],
      match_count: 2,
      match_threshold: 0.5,
      filter: { source: 'docs' },
    })
    expect(results).toEqual([
      { id: 'high', content: 'high', metadata: { source: 'docs' }, score: 0.9 },
    ])
  })

  it('supports custom table and RPC names', async () => {
    const fake = makeFakeSupabaseClient()
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => fake.client) }))

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({
      url: 'https://x.supabase.co',
      serviceRoleKey: 'k',
      table: 'project_vectors',
      matchFunction: 'match_project_vectors',
    })

    await store.store([{ id: 'a', content: 'x', embedding: [1] }])
    await store.search([1])

    expect(fake.from).toHaveBeenCalledWith('project_vectors')
    expect(fake.rpc).toHaveBeenCalledWith('match_project_vectors', expect.any(Object))
  })

  it('does not load the optional SDK for empty mutations', async () => {
    const fake = makeFakeSupabaseClient()
    const createClient = vi.fn(() => fake.client)
    vi.doMock('@supabase/supabase-js', () => ({ createClient }))

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })

    await store.store([])
    await store.delete!([])

    expect(createClient).not.toHaveBeenCalled()
  })

  it.each([
    ['store', { data: null, error: { message: 'write denied' } }],
    ['delete', { data: null, error: { message: 'delete denied' } }],
  ])('propagates %s errors as MemoryError', async (operation, response) => {
    const fake = makeFakeSupabaseClient()
    if (operation === 'store') fake.upsert.mockResolvedValue(response)
    else fake.inFilter.mockResolvedValue(response)
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => fake.client) }))

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })
    const action = operation === 'store'
      ? store.store([{ id: 'a', content: 'x', embedding: [1] }])
      : store.delete!(['a'])

    await expect(action).rejects.toThrow(/supabase (store|delete): .* denied/)
  })

  it('propagates search RPC errors as MemoryError', async () => {
    const fake = makeFakeSupabaseClient()
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'function denied' } })
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => fake.client) }))

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })

    await expect(store.search([1])).rejects.toThrow(/supabase search: function denied/)
  })

  it('creates the client lazily with the configured credentials', async () => {
    const fake = makeFakeSupabaseClient()
    const createClient = vi.fn(() => fake.client)
    vi.doMock('@supabase/supabase-js', () => ({ createClient }))

    const { supabaseVectorStore } = await import('../src/vector/supabase')
    const store = supabaseVectorStore({
      url: 'https://project.supabase.co',
      serviceRoleKey: 'server-only-key',
    })

    expect(createClient).not.toHaveBeenCalled()
    await store.search([1, 2])
    expect(createClient).toHaveBeenCalledOnce()
    expect(createClient).toHaveBeenCalledWith('https://project.supabase.co', 'server-only-key')
  })
})
