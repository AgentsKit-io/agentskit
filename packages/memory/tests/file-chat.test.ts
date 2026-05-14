import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { fileChatMemory } from '../src/file-chat'
import type { Message } from '@agentskit/core'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
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
    const mem = fileChatMemory(filepath)
    expect(await mem.load()).toEqual([])
  })

  it('save then load round-trips with date serialization', async () => {
    const mem = fileChatMemory(filepath)
    await mem.save([sampleMessage])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('hello')
    expect(loaded[0].createdAt).toBeInstanceOf(Date)
    expect(loaded[0].createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('clear removes the file', async () => {
    const mem = fileChatMemory(filepath)
    await mem.save([sampleMessage])
    await mem.clear!()
    expect(await mem.load()).toEqual([])
  })

  it('clear on non-existent file does not throw', async () => {
    const mem = fileChatMemory(filepath)
    await expect(mem.clear!()).resolves.toBeUndefined()
  })
})
