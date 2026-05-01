import { describe, it, expect } from 'vitest'
import { supabaseVectorStore } from '../src/vector/supabase'

describe('supabaseVectorStore', () => {
  it('throws a clear hint when @supabase/supabase-js is missing', async () => {
    const store = supabaseVectorStore({ url: 'https://x.supabase.co', serviceRoleKey: 'k' })
    await expect(store.store([])).rejects.toThrow(/@supabase\/supabase-js/)
  })
})
