import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'

const fakeHome = mkdtempSync(join(tmpdir(), 'agentskit-home-'))
const prevHome = process.env.HOME
const prevUserProfile = process.env.USERPROFILE
process.env.HOME = fakeHome
process.env.USERPROFILE = fakeHome

// Imported after env override so sessions.ts computes ROOT from fakeHome.
// eslint-disable-next-line import/first
import {
  forkSession,
  generateSessionId,
  listSessions,
  renameSession,
  sessionFilePath,
  writeSessionMeta,
} from '../src/sessions'

afterAll(() => {
  process.env.HOME = prevHome
  process.env.USERPROFILE = prevUserProfile
  rmSync(fakeHome, { recursive: true, force: true })
})

describe('sessions lifecycle', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'agentskit-cwd-'))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('renameSession stores a label on existing session', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta(
      {
        id,
        cwd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        preview: 'hello',
      },
      cwd,
    )
    renameSession(id, 'my-label', cwd)
    const [listed] = listSessions(cwd)
    expect(listed?.metadata.label).toBe('my-label')
  })

  it('forkSession duplicates the session file and records provenance', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[{"role":"user","content":"hi"}]')
    writeSessionMeta(
      {
        id,
        cwd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 1,
        preview: 'hi',
      },
      cwd,
    )

    const forked = forkSession(id, cwd)
    expect(forked.id).not.toBe(id)
    expect(forked.isNew).toBe(true)

    const listed = listSessions(cwd)
    const newRecord = listed.find(s => s.metadata.id === forked.id)
    expect(newRecord?.metadata.forkedFrom).toBe(id)
    expect(newRecord?.metadata.label).toBeUndefined()
  })

  it('rename + fork throw for unknown id', () => {
    expect(() => renameSession('missing', 'nope', cwd)).toThrow(/No session/)
    expect(() => forkSession('missing', cwd)).toThrow(/No session/)
  })
})
