import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Message } from '@agentskit/core'
import {
  mkdtempSync,
  rmSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'

const sampleMessage: Message = {
  id: 'test-1',
  role: 'user',
  content: 'hello',
  status: 'complete',
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

describe('fileChatMemory', () => {
  let dir: string
  let filepath: string

  beforeEach(() => {
    // mkdtempSync creates a uniquely-named directory with mode 0700, avoiding
    // the predictable-path / shared-tmp issues flagged by CodeQL js/insecure-temporary-file.
    dir = mkdtempSync(join(tmpdir(), 'agentskit-file-chat-'))
    filepath = join(dir, 'chat.json')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns empty array when file does not exist', async () => {
    const { fileChatMemory } = await import('../src/file-chat')
    const mem = fileChatMemory(filepath)
    expect(await mem.load()).toEqual([])
  })

  it('save then load round-trips with date serialization', async () => {
    const { fileChatMemory } = await import('../src/file-chat')
    const mem = fileChatMemory(filepath)
    await mem.save([sampleMessage])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('hello')
    expect(loaded[0].createdAt).toBeInstanceOf(Date)
    expect(loaded[0].createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('clear removes the file', async () => {
    const { fileChatMemory } = await import('../src/file-chat')
    const mem = fileChatMemory(filepath)
    await mem.save([sampleMessage])
    await mem.clear!()
    expect(await mem.load()).toEqual([])
  })

  it('clear on non-existent file does not throw', async () => {
    const { fileChatMemory } = await import('../src/file-chat')
    const mem = fileChatMemory(filepath)
    await expect(mem.clear!()).resolves.toBeUndefined()
  })

  describe('CM4 atomic file save', () => {
    afterEach(() => {
      vi.doUnmock('node:fs/promises')
      vi.resetModules()
      vi.restoreAllMocks()
    })

    async function loadFileChatWithFsMock(handlers: {
      writeFile?: (...args: unknown[]) => Promise<unknown>
      rename?: (...args: unknown[]) => Promise<unknown>
      unlink?: (...args: unknown[]) => Promise<unknown>
      readFile?: (...args: unknown[]) => Promise<unknown>
    }): Promise<{
      fileChatMemory: typeof import('../src/file-chat').fileChatMemory
      actual: typeof import('node:fs/promises')
      spies: {
        writeFile: ReturnType<typeof vi.fn>
        rename: ReturnType<typeof vi.fn>
        unlink: ReturnType<typeof vi.fn>
        readFile: ReturnType<typeof vi.fn>
      }
    }> {
      vi.resetModules()
      const actual = await vi.importActual<typeof import('node:fs/promises')>(
        'node:fs/promises',
      )

      const writeFile = vi.fn(
        handlers.writeFile ??
          ((...args: unknown[]) =>
            (actual.writeFile as (...a: unknown[]) => Promise<unknown>)(...args)),
      )
      const rename = vi.fn(
        handlers.rename ??
          ((...args: unknown[]) =>
            (actual.rename as (...a: unknown[]) => Promise<unknown>)(...args)),
      )
      const unlink = vi.fn(
        handlers.unlink ??
          ((...args: unknown[]) =>
            (actual.unlink as (...a: unknown[]) => Promise<unknown>)(...args)),
      )
      const readFile = vi.fn(
        handlers.readFile ??
          ((...args: unknown[]) =>
            (actual.readFile as (...a: unknown[]) => Promise<unknown>)(...args)),
      )

      vi.doMock('node:fs/promises', () => ({
        ...actual,
        writeFile,
        rename,
        unlink,
        readFile,
        default: {
          ...actual,
          writeFile,
          rename,
          unlink,
          readFile,
        },
      }))

      const mod = await import('../src/file-chat')
      return {
        fileChatMemory: mod.fileChatMemory,
        actual,
        spies: { writeFile, rename, unlink, readFile },
      }
    }

    it('writes a same-directory temporary file and publishes only via rename', async () => {
      const writtenPaths: string[] = []
      const { fileChatMemory, actual, spies } = await loadFileChatWithFsMock({
        writeFile: async (...args: unknown[]) => {
          writtenPaths.push(String(args[0]))
          return (actual.writeFile as (...a: unknown[]) => Promise<unknown>)(...args)
        },
      })

      const mem = fileChatMemory(filepath)
      await mem.save([sampleMessage])

      expect(writtenPaths.length).toBeGreaterThanOrEqual(1)
      const tempPath = writtenPaths[0]!
      expect(dirname(tempPath)).toBe(dirname(filepath))
      expect(tempPath).not.toBe(filepath)

      expect(spies.rename).toHaveBeenCalled()
      const renameCall = spies.rename.mock.calls.find(
        call => String(call[1]) === filepath,
      )
      expect(renameCall).toBeDefined()
      expect(String(renameCall![0])).toBe(tempPath)
      expect(String(renameCall![1])).toBe(filepath)

      const leftovers = readdirSync(dir).filter(name => name !== basename(filepath))
      expect(leftovers).toEqual([])
    })

    it('on rename failure keeps the prior snapshot and cleans up the temp file best-effort', async () => {
      const prior: Message = {
        id: 'prior-1',
        role: 'user',
        content: 'prior-snapshot-intact',
        status: 'complete',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const { serializeMessages } = await import('@agentskit/core')
      const priorJson = JSON.stringify(serializeMessages([prior]), null, 2)
      writeFileSync(filepath, priorJson, 'utf8')

      const tempPaths: string[] = []
      const { fileChatMemory, actual } = await loadFileChatWithFsMock({
        writeFile: async (...args: unknown[]) => {
          const p = String(args[0])
          if (p !== filepath) tempPaths.push(p)
          return (actual.writeFile as (...a: unknown[]) => Promise<unknown>)(...args)
        },
        rename: async () => {
          const err = new Error('simulated rename failure')
          ;(err as NodeJS.ErrnoException).code = 'EBUSY'
          throw err
        },
        unlink: async (...args: unknown[]) =>
          (actual.unlink as (...a: unknown[]) => Promise<unknown>)(...args),
      })

      const mem = fileChatMemory(filepath)
      const next: Message = {
        id: 'next-1',
        role: 'assistant',
        content: 'should-not-publish',
        status: 'complete',
        createdAt: new Date('2026-02-01T00:00:00Z'),
      }
      await expect(mem.save([next])).rejects.toThrow()

      expect(readFileSync(filepath, 'utf8')).toBe(priorJson)

      expect(tempPaths.length).toBeGreaterThanOrEqual(1)
      for (const temp of tempPaths) {
        expect(readdirSync(dir)).not.toContain(basename(temp))
      }
      expect(readdirSync(dir)).toEqual([basename(filepath)])
    })

    it('concurrent saves both settle and final load is one complete submitted snapshot', async () => {
      const { fileChatMemory } = await import('../src/file-chat')

      const snapshotA: Message[] = [
        {
          id: 'a-0',
          role: 'user',
          content: 'AAAA-complete-snapshot',
          status: 'complete',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'a-1',
          role: 'assistant',
          content: 'AAAA-reply',
          status: 'complete',
          createdAt: new Date('2026-01-02T00:00:00Z'),
        },
      ]
      const snapshotB: Message[] = [
        {
          id: 'b-0',
          role: 'user',
          content: 'BBBB-complete-snapshot',
          status: 'complete',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'b-1',
          role: 'assistant',
          content: 'BBBB-reply-1',
          status: 'complete',
          createdAt: new Date('2026-01-02T00:00:00Z'),
        },
        {
          id: 'b-2',
          role: 'user',
          content: 'BBBB-follow-up',
          status: 'complete',
          createdAt: new Date('2026-01-03T00:00:00Z'),
        },
      ]

      const mem = fileChatMemory(filepath)
      const settled = await Promise.allSettled([
        mem.save(snapshotA),
        mem.save(snapshotB),
      ])
      expect(settled.every(result => result.status === 'fulfilled')).toBe(true)

      const loaded = await mem.load()
      const ids = loaded.map(m => m.id)
      const isA = ids.join(',') === 'a-0,a-1'
      const isB = ids.join(',') === 'b-0,b-1,b-2'
      expect(isA || isB).toBe(true)
      if (isA) {
        expect(loaded.map(m => m.content)).toEqual(snapshotA.map(m => m.content))
      } else {
        expect(loaded.map(m => m.content)).toEqual(snapshotB.map(m => m.content))
      }
      expect(readdirSync(dir)).toEqual([basename(filepath)])
    })
  })
})
