import { describe, expect, it } from 'vitest'
import type { ChatMemory, Message } from '@agentskit/core'
import { createEncryptedMemory } from '../src/encrypted'

function memoryStore(initial: Message[] = []): ChatMemory & { current: () => Message[] } {
  let msgs = [...initial]
  return {
    async load() {
      return [...msgs]
    },
    async save(next) {
      msgs = [...next]
    },
    async clear() {
      msgs = []
    },
    current: () => [...msgs],
  }
}

function msg(content: string, id = content): Message {
  return { id, role: 'user', content, status: 'complete', createdAt: new Date(0) }
}

const key = new Uint8Array(32)
for (let i = 0; i < 32; i++) key[i] = i

describe('createEncryptedMemory', () => {
  it('round-trips messages through encrypt + decrypt', async () => {
    const backing = memoryStore()
    const encrypted = await createEncryptedMemory({ backing, key })
    await encrypted.save([msg('hello world'), msg('second')])
    const out = await encrypted.load()
    expect(out.map(m => m.content)).toEqual(['hello world', 'second'])
  })

  it('backing store never sees plaintext', async () => {
    const backing = memoryStore()
    const encrypted = await createEncryptedMemory({ backing, key })
    await encrypted.save([msg('top secret', 'id-1')])
    const persisted = backing.current()[0]!
    expect(persisted.content).toBe('')
    expect(persisted.metadata?.agentskitEncrypted).toBe(true)
    expect(typeof persisted.metadata?.ciphertext).toBe('string')
    expect(typeof persisted.metadata?.iv).toBe('string')
    expect(JSON.stringify(persisted)).not.toContain('top secret')
  })

  it('rejects keys that are not 32 bytes', async () => {
    await expect(
      createEncryptedMemory({ backing: memoryStore(), key: new Uint8Array(16) }),
    ).rejects.toThrow(/32 bytes/)
  })

  it('decrypts with the same key across instances', async () => {
    const backing = memoryStore()
    const first = await createEncryptedMemory({ backing, key })
    await first.save([msg('shared')])

    const second = await createEncryptedMemory({ backing, key })
    const out = await second.load()
    expect(out[0]!.content).toBe('shared')
  })

  it('fails to decrypt with a different key', async () => {
    const backing = memoryStore()
    const writer = await createEncryptedMemory({ backing, key })
    await writer.save([msg('secret')])

    const other = new Uint8Array(32)
    other.fill(9)
    const reader = await createEncryptedMemory({ backing, key: other })
    await expect(reader.load()).rejects.toBeDefined()
  })

  it('accepts AAD and refuses decryption without matching AAD', async () => {
    const backing = memoryStore()
    const writer = await createEncryptedMemory({
      backing,
      key,
      aad: new TextEncoder().encode('tenant-1'),
    })
    await writer.save([msg('scoped')])

    const reader = await createEncryptedMemory({
      backing,
      key,
      aad: new TextEncoder().encode('tenant-2'),
    })
    await expect(reader.load()).rejects.toBeDefined()
  })

  it('idempotent save — already-encrypted messages are not re-encrypted', async () => {
    const backing = memoryStore()
    const encrypted = await createEncryptedMemory({ backing, key })
    await encrypted.save([msg('once')])
    const first = backing.current()[0]!
    // Save the already-encrypted view back — should not double-encrypt.
    await backing.save(backing.current())
    const out = await encrypted.load()
    expect(out[0]!.content).toBe('once')
    expect(backing.current()[0]!.metadata?.ciphertext).toBe(first.metadata?.ciphertext)
  })

  it('clear delegates to backing', async () => {
    const backing = memoryStore([msg('a')])
    const encrypted = await createEncryptedMemory({ backing, key })
    await encrypted.clear?.()
    expect(backing.current()).toHaveLength(0)
  })
})
