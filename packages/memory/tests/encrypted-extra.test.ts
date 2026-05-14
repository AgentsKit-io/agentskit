import { describe, expect, it, vi } from 'vitest'
import type { ChatMemory, Message } from '@agentskit/core'
import { createEncryptedMemory } from '../src/encrypted'

function memoryStore(initial: Message[] = []): ChatMemory & { current: () => Message[] } {
  let msgs = [...initial]
  return {
    async load() { return [...msgs] },
    async save(next) { msgs = [...next] },
    async clear() { msgs = [] },
    current: () => [...msgs],
  }
}

function msg(content: string, id = content): Message {
  return { id, role: 'user', content, status: 'complete', createdAt: new Date(0) }
}

const key = new Uint8Array(32)
for (let i = 0; i < 32; i++) key[i] = i + 1

describe('createEncryptedMemory — extra branches', () => {
  it('throws MemoryError when SubtleCrypto is not available', async () => {
    // Temporarily remove globalThis.crypto so neither path provides SubtleCrypto
    const origCrypto = globalThis.crypto
    vi.stubGlobal('crypto', undefined)
    try {
      await expect(
        createEncryptedMemory({
          backing: memoryStore(),
          key,
          // subtle is undefined, and globalThis.crypto is also undefined
        }),
      ).rejects.toMatchObject({ code: 'AK_MEMORY_LOAD_FAILED' })
    } finally {
      vi.stubGlobal('crypto', origCrypto)
    }
  })

  it('accepts a CryptoKey directly (resolveKey branch)', async () => {
    // Import a CryptoKey and pass it directly
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    )
    const backing = memoryStore()
    const enc = await createEncryptedMemory({ backing, key: cryptoKey })
    await enc.save([msg('crypto key test')])
    const out = await enc.load()
    expect(out[0]?.content).toBe('crypto key test')
  })

  it('browser btoa/atob path for toBase64/fromBase64 when Buffer is unavailable', async () => {
    // Override the subtle to use a custom encoding that exercises the browser path.
    // We simulate a missing Buffer by temporarily hiding it:
    const origBuffer = globalThis.Buffer
    // @ts-expect-error -- intentionally removing Buffer to hit browser path
    globalThis.Buffer = undefined

    try {
      const backing = memoryStore()
      const enc = await createEncryptedMemory({ backing, key })
      await enc.save([msg('no buffer')])
      const out = await enc.load()
      expect(out[0]?.content).toBe('no buffer')
    } finally {
      globalThis.Buffer = origBuffer
    }
  })

  it('clear delegates to backing.clear when backing has clear', async () => {
    const backing = memoryStore([msg('a')])
    const enc = await createEncryptedMemory({ backing, key })
    await enc.clear?.()
    expect(backing.current()).toHaveLength(0)
  })

  it('load passthrough for messages without agentskitEncrypted flag', async () => {
    const plainMsg = msg('plain')
    const backing = memoryStore([plainMsg])
    const enc = await createEncryptedMemory({ backing, key })
    // Load without saving (messages are not encrypted)
    const out = await enc.load()
    expect(out[0]?.content).toBe('plain')
  })
})
