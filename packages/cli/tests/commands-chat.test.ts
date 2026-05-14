/**
 * Tests for commands/chat.ts — covers the non-Ink action paths:
 * - --list-sessions (no sessions / with sessions)
 * We cannot easily render the full ChatApp (Ink), so we focus on
 * the parts that run before render().
 */
import { describe, it, expect, vi, afterEach, afterAll, beforeEach } from 'vitest'
import { Command } from 'commander'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Override HOME for sessions
const fakeHome = mkdtempSync(join(tmpdir(), 'agentskit-chat-test-'))
const prevHome = process.env.HOME
const prevUserProfile = process.env.USERPROFILE
process.env.HOME = fakeHome
process.env.USERPROFILE = fakeHome

import {
  generateSessionId,
  sessionFilePath,
  writeSessionMeta,
} from '../src/sessions'

afterAll(() => {
  process.env.HOME = prevHome
  process.env.USERPROFILE = prevUserProfile
  rmSync(fakeHome, { recursive: true, force: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

let cwd: string

function makeProgram(): Command {
  const p = new Command()
  p.exitOverride()
  return p
}

describe('registerChatCommand — --list-sessions', () => {
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'agentskit-chat-cwd-'))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('outputs "No saved sessions" when no sessions in cwd', async () => {
    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)

    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync(['node', 'cli', 'chat', '--list-sessions'])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    expect(output).toContain('No saved sessions')
  })

  it('lists existing sessions with metadata', async () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({
      id,
      cwd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 3,
      preview: 'hello world',
      model: 'gpt-4',
    }, cwd)

    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)

    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync(['node', 'cli', 'chat', '--list-sessions'])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    expect(output).toContain('msgs=3')
    expect(output).toContain('model=gpt-4')
    expect(output).toContain('hello world')
  })

  it('displays label and fork info in session listing', async () => {
    const id = generateSessionId()
    const forkedFromId = 'original-session-id'
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({
      id,
      cwd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 1,
      preview: 'test',
      label: 'my-test-session',
      forkedFrom: forkedFromId,
    }, cwd)

    const { registerChatCommand } = await import('../src/commands/chat')
    const program = makeProgram()
    registerChatCommand(program)

    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await program.parseAsync(['node', 'cli', 'chat', '--list-sessions'])

    const output = stdoutSpy.mock.calls.map(c => c[0] as string).join('')
    expect(output).toContain('my-test-session')
    expect(output).toContain('← fork')
    expect(output).toContain(forkedFromId)
  })
})
