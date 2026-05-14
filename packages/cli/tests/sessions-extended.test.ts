/**
 * Extended session tests to cover uncovered branches:
 *  - resolveSession paths
 *  - listSessions with legacy (no meta) files
 *  - findSession / findLatestSession
 *  - derivePreview
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Override HOME so sessions write to a temp dir
const fakeHome = mkdtempSync(join(tmpdir(), 'agentskit-sessions-ext-'))
const prevHome = process.env.HOME
const prevUserProfile = process.env.USERPROFILE
process.env.HOME = fakeHome
process.env.USERPROFILE = fakeHome

import {
  derivePreview,
  findLatestSession,
  findSession,
  generateSessionId,
  listSessions,
  resolveSession,
  sessionFilePath,
  writeSessionMeta,
} from '../src/sessions'

afterAll(() => {
  process.env.HOME = prevHome
  process.env.USERPROFILE = prevUserProfile
  rmSync(fakeHome, { recursive: true, force: true })
})

let cwd: string

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'agentskit-cwd-ext-'))
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// derivePreview
// ---------------------------------------------------------------------------

describe('derivePreview', () => {
  it('returns (empty) when no messages', () => {
    expect(derivePreview([])).toBe('(empty)')
  })

  it('returns (empty) when no user message', () => {
    expect(derivePreview([{ role: 'assistant', content: 'hi' }])).toBe('(empty)')
  })

  it('truncates long first user message', () => {
    const long = 'a'.repeat(100)
    const preview = derivePreview([{ role: 'user', content: long }])
    expect(preview.length).toBeLessThanOrEqual(81) // 80 chars + ellipsis
    expect(preview.endsWith('…')).toBe(true)
  })

  it('normalises whitespace to single spaces', () => {
    const preview = derivePreview([{ role: 'user', content: 'hello\n  world' }])
    expect(preview).toBe('hello world')
  })

  it('returns the first user content when short', () => {
    const preview = derivePreview([
      { role: 'assistant', content: 'x' },
      { role: 'user', content: 'short' },
    ])
    expect(preview).toBe('short')
  })
})

// ---------------------------------------------------------------------------
// resolveSession
// ---------------------------------------------------------------------------

describe('resolveSession', () => {
  it('returns custom session when explicitPath is provided', () => {
    const explicitPath = join(cwd, 'custom.json')
    const session = resolveSession({ explicitPath, cwd })
    expect(session.id).toBe('custom')
    expect(session.file).toBe(explicitPath)
    expect(session.isNew).toBe(true)
  })

  it('returns custom session with isNew=false when path exists', () => {
    const explicitPath = join(cwd, 'existing.json')
    writeFileSync(explicitPath, '[]')
    const session = resolveSession({ explicitPath, cwd })
    expect(session.isNew).toBe(false)
  })

  it('forceNew generates a fresh session', () => {
    const session = resolveSession({ forceNew: true, cwd })
    expect(session.isNew).toBe(true)
    expect(session.id).not.toBe('custom')
  })

  it('resumeId=true resumes latest session when one exists', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({
      id,
      cwd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 1,
      preview: 'test',
    }, cwd)

    const session = resolveSession({ resumeId: true, cwd })
    expect(session.id).toBe(id)
    expect(session.isNew).toBe(false)
  })

  it('resumeId=true creates new when no sessions exist', () => {
    const session = resolveSession({ resumeId: true, cwd })
    // No sessions → falls through to new
    expect(session.isNew).toBe(true)
  })

  it('resumeId string that matches existing session', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({
      id,
      cwd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      preview: 'xyz',
    }, cwd)

    const session = resolveSession({ resumeId: id, cwd })
    expect(session.id).toBe(id)
    expect(session.isNew).toBe(false)
  })

  it('resumeId string that does NOT match → warns and creates new', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const session = resolveSession({ resumeId: 'doesnotexist', cwd })
    expect(session.isNew).toBe(true)
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No session matching'))
  })

  it('no options → resumes latest if present', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({
      id,
      cwd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 2,
      preview: 'hi',
    }, cwd)

    const session = resolveSession({ cwd })
    expect(session.id).toBe(id)
    expect(session.isNew).toBe(false)
  })

  it('no options and no sessions → creates new', () => {
    const session = resolveSession({ cwd })
    expect(session.isNew).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// findSession
// ---------------------------------------------------------------------------

describe('findSession', () => {
  it('returns null when no sessions exist', () => {
    expect(findSession('anything', cwd)).toBeNull()
  })

  it('finds session by exact id', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({ id, cwd, createdAt: '', updatedAt: '', messageCount: 0, preview: '' }, cwd)
    expect(findSession(id, cwd)?.metadata.id).toBe(id)
  })

  it('finds session by prefix', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({ id, cwd, createdAt: '', updatedAt: '', messageCount: 0, preview: '' }, cwd)
    expect(findSession(id.slice(0, 6), cwd)?.metadata.id).toBe(id)
  })

  it('finds session by label', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    writeSessionMeta({ id, cwd, createdAt: '', updatedAt: new Date().toISOString(), messageCount: 0, preview: '', label: 'my-label' }, cwd)
    expect(findSession('my-label', cwd)?.metadata.id).toBe(id)
  })
})

// ---------------------------------------------------------------------------
// listSessions — legacy file without meta
// ---------------------------------------------------------------------------

describe('listSessions legacy', () => {
  it('synthesises metadata for sessions without a .meta.json file', () => {
    const id = generateSessionId()
    const file = sessionFilePath(id, cwd)
    writeFileSync(file, '[]')
    // intentionally do NOT write meta

    const records = listSessions(cwd)
    expect(records).toHaveLength(1)
    expect(records[0]!.metadata.preview).toBe('(legacy session)')
  })

  it('returns [] when cwd dir does not exist', () => {
    expect(listSessions(join(cwd, 'nonexistent-subdir'))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// findLatestSession
// ---------------------------------------------------------------------------

describe('findLatestSession', () => {
  it('returns null when no sessions', () => {
    expect(findLatestSession(cwd)).toBeNull()
  })

  it('returns the most recently updated session', () => {
    const id1 = generateSessionId()
    const file1 = sessionFilePath(id1, cwd)
    writeFileSync(file1, '[]')
    writeSessionMeta({ id: id1, cwd, createdAt: '', updatedAt: '2024-01-01T00:00:00Z', messageCount: 0, preview: 'a' }, cwd)

    const id2 = generateSessionId()
    const file2 = sessionFilePath(id2, cwd)
    writeFileSync(file2, '[]')
    writeSessionMeta({ id: id2, cwd, createdAt: '', updatedAt: '2025-01-01T00:00:00Z', messageCount: 0, preview: 'b' }, cwd)

    const latest = findLatestSession(cwd)
    expect(latest?.metadata.id).toBe(id2)
  })
})
