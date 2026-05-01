import { describe, it, expect } from 'vitest'
import { tursoChatMemory } from '../src/turso'

describe('tursoChatMemory', () => {
  it('throws a clear hint when @libsql/client is missing', async () => {
    const mem = tursoChatMemory({ url: 'file:./does-not-exist.db' })
    await expect(mem.load()).rejects.toThrow(/@libsql\/client/)
  })
})
