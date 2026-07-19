import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ChatMemory, Message } from '@agentskit/core'
import { fileChatMemory } from '../src/file-chat'
import { sqliteChatMemory } from '../src/sqlite'
import { redisChatMemory } from '../src/redis-chat'
import type { RedisClientAdapter } from '../src/redis-client'
import { createEncryptedMemory } from '../src/encrypted'
import { wrapChatMemoryWithRedaction } from '../src/redaction'
import { createHierarchicalMemory } from '../src/hierarchical'
import { DEFAULT_PII_RULES } from '@agentskit/core/security'
import type { RedactionVault } from '@agentskit/core/security'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlink } from 'node:fs/promises'

type MemoryOperationOptions = Parameters<ChatMemory['load']>[0]

const sampleMessage: Message = {
  id: 'cancel-1',
  role: 'user',
  content: 'hello cancel',
  status: 'complete',
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

/** Already-aborted signal (reason is DOMException AbortError). */
function alreadyAbortedSignal(): AbortSignal {
  const controller = new AbortController()
  controller.abort()
  return controller.signal
}

async function expectAbortError(run: () => Promise<unknown>): Promise<void> {
  let rejected: unknown
  try {
    await run()
  } catch (err) {
    rejected = err
  }
  expect(rejected).toBeDefined()
  expect(rejected).toMatchObject({ name: 'AbortError' })
}

/**
 * ADR 0019 contract: load / save / clear reject promptly with AbortError
 * when given an already-aborted signal, without performing backend work.
 */
function describeAlreadyAbortedContract(
  label: string,
  setup: () => {
    memory: ChatMemory
    assertNoSideEffects?: () => void
    cleanup?: () => void | Promise<void>
  },
): void {
  describe(`${label} — already-aborted ops (ADR 0019)`, () => {
    let memory: ChatMemory
    let assertNoSideEffects: (() => void) | undefined
    let cleanup: (() => void | Promise<void>) | undefined

    beforeEach(() => {
      const ctx = setup()
      memory = ctx.memory
      assertNoSideEffects = ctx.assertNoSideEffects
      cleanup = ctx.cleanup
    })

    afterEach(async () => {
      await cleanup?.()
    })

    it('load rejects with AbortError', async () => {
      await expectAbortError(() => memory.load({ signal: alreadyAbortedSignal() }))
      assertNoSideEffects?.()
    })

    it('save rejects with AbortError', async () => {
      await expectAbortError(() =>
        memory.save([sampleMessage], { signal: alreadyAbortedSignal() }),
      )
      assertNoSideEffects?.()
    })

    it('clear rejects with AbortError', async () => {
      expect(memory.clear).toBeTypeOf('function')
      await expectAbortError(() => memory.clear!({ signal: alreadyAbortedSignal() }))
      assertNoSideEffects?.()
    })
  })
}

// ─── Backends: already-aborted ───────────────────────────────────────────────

describeAlreadyAbortedContract('fileChatMemory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentskit-cancel-file-'))
  const filepath = join(dir, 'chat.json')
  return {
    memory: fileChatMemory(filepath),
    assertNoSideEffects: () => {
      expect(existsSync(filepath)).toBe(false)
    },
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true })
    },
  }
})

describeAlreadyAbortedContract('sqliteChatMemory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentskit-cancel-sqlite-'))
  const dbPath = join(dir, 'chat.db')
  return {
    memory: sqliteChatMemory({ path: dbPath }),
    assertNoSideEffects: () => {
      // Pre-abort must not open the DB (better-sqlite3 creates the file on open).
      expect(existsSync(dbPath)).toBe(false)
    },
    cleanup: async () => {
      try {
        await unlink(dbPath)
      } catch {
        /* ignore */
      }
      rmSync(dir, { recursive: true, force: true })
    },
  }
})

describeAlreadyAbortedContract('redisChatMemory', () => {
  const get = vi.fn(async () => null)
  const set = vi.fn(async () => {})
  const del = vi.fn(async () => {})
  const keys = vi.fn(async () => [] as string[])
  const disconnect = vi.fn(async () => {})
  const call = vi.fn(async () => null)
  const client: RedisClientAdapter = { get, set, del, keys, disconnect, call }

  return {
    memory: redisChatMemory({ url: '', client }),
    assertNoSideEffects: () => {
      expect(get).not.toHaveBeenCalled()
      expect(set).not.toHaveBeenCalled()
      expect(del).not.toHaveBeenCalled()
      expect(keys).not.toHaveBeenCalled()
      expect(disconnect).not.toHaveBeenCalled()
      expect(call).not.toHaveBeenCalled()
    },
  }
})

describe('tursoChatMemory — already-aborted ops (ADR 0019)', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('@libsql/client')
  })

  async function setupTurso() {
    const execute = vi.fn(async () => ({ rows: [] as Array<Record<string, unknown>> }))
    const createClient = vi.fn(() => ({ execute }))
    vi.doMock('@libsql/client', () => ({ createClient }))
    const { tursoChatMemory } = await import('../src/turso')
    const memory = tursoChatMemory({ url: 'file::memory:', conversationId: 'cancel-test' })
    return { memory, execute, createClient }
  }

  it('load rejects with AbortError and does not open a client', async () => {
    const { memory, execute, createClient } = await setupTurso()
    await expectAbortError(() => memory.load({ signal: alreadyAbortedSignal() }))
    expect(createClient).not.toHaveBeenCalled()
    expect(execute).not.toHaveBeenCalled()
  })

  it('save rejects with AbortError and does not open a client', async () => {
    const { memory, execute, createClient } = await setupTurso()
    await expectAbortError(() =>
      memory.save([sampleMessage], { signal: alreadyAbortedSignal() }),
    )
    expect(createClient).not.toHaveBeenCalled()
    expect(execute).not.toHaveBeenCalled()
  })

  it('clear rejects with AbortError and does not open a client', async () => {
    const { memory, execute, createClient } = await setupTurso()
    expect(memory.clear).toBeTypeOf('function')
    await expectAbortError(() => memory.clear!({ signal: alreadyAbortedSignal() }))
    expect(createClient).not.toHaveBeenCalled()
    expect(execute).not.toHaveBeenCalled()
  })
})

// ─── Wrappers: option forwarding + pre-abort side-effect barrier ─────────────

function trackingBacking(): {
  backing: ChatMemory
  loads: Array<MemoryOperationOptions | undefined>
  saves: Array<{ messages: Message[]; options: MemoryOperationOptions | undefined }>
  clears: Array<MemoryOperationOptions | undefined>
} {
  const loads: Array<MemoryOperationOptions | undefined> = []
  const saves: Array<{ messages: Message[]; options: MemoryOperationOptions | undefined }> = []
  const clears: Array<MemoryOperationOptions | undefined> = []
  const backing: ChatMemory = {
    load: async options => {
      loads.push(options)
      return []
    },
    save: async (messages, options) => {
      saves.push({ messages, options })
    },
    clear: async options => {
      clears.push(options)
    },
  }
  return { backing, loads, saves, clears }
}

describe('createEncryptedMemory — ADR 0019 signal propagation', () => {
  const key = new Uint8Array(32)
  for (let i = 0; i < 32; i++) key[i] = i

  it('forwards the exact MemoryOperationOptions to backing load/save/clear', async () => {
    const { backing, loads, saves, clears } = trackingBacking()
    const encrypted = await createEncryptedMemory({ backing, key })

    const loadOpts: MemoryOperationOptions = { signal: new AbortController().signal }
    const saveOpts: MemoryOperationOptions = { signal: new AbortController().signal }
    const clearOpts: MemoryOperationOptions = { signal: new AbortController().signal }

    await encrypted.load(loadOpts)
    await encrypted.save([sampleMessage], saveOpts)
    await encrypted.clear!(clearOpts)

    expect(loads).toHaveLength(1)
    expect(loads[0]).toBe(loadOpts)
    expect(saves).toHaveLength(1)
    expect(saves[0]?.options).toBe(saveOpts)
    expect(clears).toHaveLength(1)
    expect(clears[0]).toBe(clearOpts)
  })

  it('pre-abort rejects with AbortError before encrypt or persist', async () => {
    const { backing, saves } = trackingBacking()
    const encrypt = vi.fn(async () => {
      throw new Error('encrypt must not run after pre-abort')
    })
    const subtle = {
      importKey: globalThis.crypto.subtle.importKey.bind(globalThis.crypto.subtle),
      encrypt,
      decrypt: globalThis.crypto.subtle.decrypt.bind(globalThis.crypto.subtle),
    } as unknown as SubtleCrypto

    const encrypted = await createEncryptedMemory({ backing, key, subtle })
    await expectAbortError(() =>
      encrypted.save([sampleMessage], { signal: alreadyAbortedSignal() }),
    )
    expect(encrypt).not.toHaveBeenCalled()
    expect(saves).toHaveLength(0)
  })
})

describe('wrapChatMemoryWithRedaction — ADR 0019 signal propagation', () => {
  it('forwards the exact MemoryOperationOptions to backing load/save/clear', async () => {
    const { backing, loads, saves, clears } = trackingBacking()
    const wrapped = wrapChatMemoryWithRedaction(backing, { rules: DEFAULT_PII_RULES })

    const loadOpts: MemoryOperationOptions = { signal: new AbortController().signal }
    const saveOpts: MemoryOperationOptions = { signal: new AbortController().signal }
    const clearOpts: MemoryOperationOptions = { signal: new AbortController().signal }

    await wrapped.load(loadOpts)
    await wrapped.save([{ ...sampleMessage, content: 'no pii here' }], saveOpts)
    await wrapped.clear!(clearOpts)

    expect(loads).toHaveLength(1)
    expect(loads[0]).toBe(loadOpts)
    expect(saves).toHaveLength(1)
    expect(saves[0]?.options).toBe(saveOpts)
    expect(clears).toHaveLength(1)
    expect(clears[0]).toBe(clearOpts)
  })

  it('pre-abort rejects with AbortError before redaction vault writes or persist', async () => {
    const { backing, saves } = trackingBacking()
    const put = vi.fn(async () => {})
    const vault: RedactionVault = {
      put,
      get: vi.fn(async () => null),
    }
    const wrapped = wrapChatMemoryWithRedaction(backing, {
      rules: DEFAULT_PII_RULES,
      mode: 'tokenize',
      vault,
      allowedRoles: ['support'],
    })

    await expectAbortError(() =>
      wrapped.save(
        [{ ...sampleMessage, content: 'email me alice@example.com' }],
        { signal: alreadyAbortedSignal() },
      ),
    )
    expect(put).not.toHaveBeenCalled()
    expect(saves).toHaveLength(0)
  })
})

describe('createHierarchicalMemory — ADR 0019 signal propagation', () => {
  function tier(): ChatMemory & {
    loads: Array<MemoryOperationOptions | undefined>
    saves: Array<MemoryOperationOptions | undefined>
    clears: Array<MemoryOperationOptions | undefined>
  } {
    let messages: Message[] = []
    const loads: Array<MemoryOperationOptions | undefined> = []
    const saves: Array<MemoryOperationOptions | undefined> = []
    const clears: Array<MemoryOperationOptions | undefined> = []
    return {
      loads,
      saves,
      clears,
      load: async options => {
        loads.push(options)
        return [...messages]
      },
      save: async (next, options) => {
        saves.push(options)
        messages = [...next]
      },
      clear: async options => {
        clears.push(options)
        messages = []
      },
    }
  }

  it('forwards the exact MemoryOperationOptions to working and archival ChatMemory ops', async () => {
    const working = tier()
    const archival = tier()
    const hub = createHierarchicalMemory({
      working,
      archival,
      workingLimit: 10,
    })

    const loadOpts: MemoryOperationOptions = { signal: new AbortController().signal }
    const saveOpts: MemoryOperationOptions = { signal: new AbortController().signal }
    const clearOpts: MemoryOperationOptions = { signal: new AbortController().signal }

    await hub.load(loadOpts)
    await hub.save([sampleMessage], saveOpts)
    await hub.clear!(clearOpts)

    expect(working.loads.some(o => o === loadOpts)).toBe(true)
    expect(working.saves.some(o => o === saveOpts)).toBe(true)
    expect(archival.saves.some(o => o === saveOpts)).toBe(true)
    expect(working.clears.some(o => o === clearOpts)).toBe(true)
    expect(archival.clears.some(o => o === clearOpts)).toBe(true)
  })

  it('pre-abort rejects with AbortError before indexing or persistence', async () => {
    const working = tier()
    const archival = tier()
    const index = vi.fn(async () => {
      throw new Error('index must not run after pre-abort')
    })
    const hub = createHierarchicalMemory({
      working,
      archival,
      workingLimit: 1,
      recall: {
        index,
        query: async () => [],
      },
    })

    const overflow: Message[] = [
      { ...sampleMessage, id: 'm0', content: 'old' },
      { ...sampleMessage, id: 'm1', content: 'new', createdAt: new Date('2026-01-02T00:00:00Z') },
    ]

    await expectAbortError(() =>
      hub.save(overflow, { signal: alreadyAbortedSignal() }),
    )
    expect(index).not.toHaveBeenCalled()
    expect(working.saves).toHaveLength(0)
    expect(archival.saves).toHaveLength(0)
  })
})
