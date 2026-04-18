import { createHash, randomBytes } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface SessionMetadata {
  id: string
  cwd: string
  createdAt: string
  updatedAt: string
  messageCount: number
  preview: string
  provider?: string
  model?: string
  /** Optional human-readable label. Set via `/rename` or `renameSession`. */
  label?: string
  /** Session id this one was forked from, if any. */
  forkedFrom?: string
}

export interface SessionRecord {
  metadata: SessionMetadata
  file: string
}

const ROOT = join(homedir(), '.agentskit', 'sessions')
const META_SUFFIX = '.meta.json'

function cwdHash(cwd: string = process.cwd()): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 12)
}

function dirFor(cwd: string = process.cwd()): string {
  return join(ROOT, cwdHash(cwd))
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/** Generate a new session id — ISO-ish timestamp + 6 random hex chars. */
export function generateSessionId(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const suffix = randomBytes(3).toString('hex')
  return `${ts}-${suffix}`
}

export function sessionFilePath(id: string, cwd: string = process.cwd()): string {
  ensureDir(dirFor(cwd))
  return join(dirFor(cwd), `${id}.json`)
}

function metaPath(id: string, cwd: string = process.cwd()): string {
  return join(dirFor(cwd), `${id}${META_SUFFIX}`)
}

function readMeta(id: string, cwd: string = process.cwd()): SessionMetadata | null {
  const path = metaPath(id, cwd)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SessionMetadata
  } catch {
    return null
  }
}

export function writeSessionMeta(meta: SessionMetadata, cwd: string = process.cwd()): void {
  ensureDir(dirFor(cwd))
  writeFileSync(metaPath(meta.id, cwd), JSON.stringify(meta, null, 2))
}

/** Derive a short preview (first user message, one line, max 80 chars). */
export function derivePreview(messages: Array<{ role: string; content: string }>): string {
  const firstUser = messages.find(m => m.role === 'user' && m.content.trim())
  if (!firstUser) return '(empty)'
  const single = firstUser.content.replace(/\s+/g, ' ').trim()
  return single.length > 80 ? `${single.slice(0, 80)}…` : single
}

export function listSessions(cwd: string = process.cwd()): SessionRecord[] {
  const dir = dirFor(cwd)
  if (!existsSync(dir)) return []

  const entries = readdirSync(dir)
  const records: SessionRecord[] = []

  for (const entry of entries) {
    if (!entry.endsWith('.json') || entry.endsWith(META_SUFFIX)) continue
    const id = entry.replace(/\.json$/, '')
    const meta = readMeta(id, cwd)
    const file = join(dir, entry)
    if (meta) {
      records.push({ metadata: meta, file })
    } else {
      // No meta file — synthesize from file stats so legacy sessions still show.
      const stats = statSync(file)
      records.push({
        metadata: {
          id,
          cwd,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          messageCount: 0,
          preview: '(legacy session)',
        },
        file,
      })
    }
  }

  // Most recently updated first
  records.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt))
  return records
}

export function findLatestSession(cwd: string = process.cwd()): SessionRecord | null {
  const all = listSessions(cwd)
  return all[0] ?? null
}

export function findSession(id: string, cwd: string = process.cwd()): SessionRecord | null {
  const all = listSessions(cwd)
  const exact = all.find(s => s.metadata.id === id || s.metadata.label === id)
  if (exact) return exact
  // Allow prefix match so users can type the first few chars.
  const prefix = all.find(s => s.metadata.id.startsWith(id))
  return prefix ?? null
}

/** Attach or update a human-readable label on an existing session. */
export function renameSession(
  id: string,
  label: string,
  cwd: string = process.cwd(),
): SessionMetadata {
  const record = findSession(id, cwd)
  if (!record) throw new Error(`No session matching "${id}".`)
  const next: SessionMetadata = { ...record.metadata, label, updatedAt: new Date().toISOString() }
  writeSessionMeta(next, cwd)
  return next
}

/**
 * Copy an existing session's message file into a new session so the user
 * can branch a conversation without disturbing the original.
 */
export function forkSession(
  id: string,
  cwd: string = process.cwd(),
): ResolvedSession {
  const record = findSession(id, cwd)
  if (!record) throw new Error(`No session matching "${id}".`)

  const newId = generateSessionId()
  const newFile = sessionFilePath(newId, cwd)

  if (existsSync(record.file)) {
    writeFileSync(newFile, readFileSync(record.file, 'utf8'))
  }

  const now = new Date().toISOString()
  writeSessionMeta(
    {
      ...record.metadata,
      id: newId,
      createdAt: now,
      updatedAt: now,
      forkedFrom: record.metadata.id,
      label: undefined,
    },
    cwd,
  )

  return { id: newId, file: newFile, isNew: true }
}

export interface ResolveSessionInput {
  explicitPath?: string
  resumeId?: string | true
  forceNew?: boolean
  cwd?: string
}

export interface ResolvedSession {
  id: string
  file: string
  isNew: boolean
}

/**
 * Decide which session file to read/write:
 * - `explicitPath` wins if given (legacy `--memory-path` flag).
 * - `forceNew` creates a fresh session.
 * - `resumeId === true` → latest in cwd.
 * - `resumeId` string → that id (or prefix).
 * - Otherwise: resume latest if one exists, else create new. Matches
 *   Claude Code's "pick up where you left off" default.
 */
export function resolveSession(input: ResolveSessionInput): ResolvedSession {
  const cwd = input.cwd ?? process.cwd()

  if (input.explicitPath) {
    return { id: 'custom', file: input.explicitPath, isNew: !existsSync(input.explicitPath) }
  }

  if (input.forceNew) {
    const id = generateSessionId()
    return { id, file: sessionFilePath(id, cwd), isNew: true }
  }

  if (input.resumeId) {
    const target = input.resumeId === true
      ? findLatestSession(cwd)
      : findSession(input.resumeId, cwd)
    if (target) {
      return { id: target.metadata.id, file: target.file, isNew: false }
    }
    // Explicit resume asked for a session that doesn't exist — fall through
    // to a new one rather than erroring, and warn.
    process.stderr.write(
      `No session matching "${String(input.resumeId)}" — starting a new one.\n`
    )
  }

  const latest = findLatestSession(cwd)
  if (latest) return { id: latest.metadata.id, file: latest.file, isNew: false }

  const id = generateSessionId()
  return { id, file: sessionFilePath(id, cwd), isNew: true }
}
