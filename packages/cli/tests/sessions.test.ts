import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'

const fakeHome = mkdtempSync(join(tmpdir(), 'agentskit-home-'))
const prevHome = process.env.HOME
const prevUserProfile = process.env.USERPROFILE
// cross-platform-ignore: isolate Node's home lookup before loading sessions.ts
process.env.HOME = fakeHome
process.env.USERPROFILE = fakeHome

// Load after the environment override so sessions.ts computes ROOT from fakeHome.
const {
  forkSession,
  generateSessionId,
  listSessions,
  renameSession,
  resolveSession,
  sessionFilePath,
  writeSessionMeta,
} = await import('../src/sessions')

afterAll(() => {
  // cross-platform-ignore: restore the host home after the isolated test
  if (prevHome === undefined) delete process.env.HOME
  else process.env.HOME = prevHome
  // cross-platform-ignore: restore the host home after the isolated test
  if (prevUserProfile === undefined) delete process.env.USERPROFILE
  else process.env.USERPROFILE = prevUserProfile
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

  it('reopens a session persisted under the previous cwd hash', () => {
    const project = '/workspace/project'
    const id = '2026-01-01T00-00-00-abcd12'
    const priorDir = join(fakeHome, '.agentskit', 'sessions', 'e3af8a725158')
    mkdirSync(priorDir, { recursive: true })
    const priorFile = join(priorDir, `${id}.json`)
    const messages = [{ role: 'user', content: 'persisted session' }]
    writeFileSync(priorFile, JSON.stringify(messages))

    const reopened = resolveSession({ resumeId: id, cwd: project })

    expect(reopened.file).toBe(priorFile)
    expect(JSON.parse(readFileSync(reopened.file, 'utf8'))).toEqual(messages)
    expect(sessionFilePath(id, 'C:\\workspace\\project')).toBe(
      join(fakeHome, '.agentskit', 'sessions', '67e1c5554ad1', `${id}.json`),
    )
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
