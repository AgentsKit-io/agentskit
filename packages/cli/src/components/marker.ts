/**
 * Install marker + tamper-evident audit chain (RFC-0006 D9/D15).
 *
 * Two cooperating records track what was installed and prove it was not silently
 * altered:
 *
 *   • The **install marker** is the `installed[]` array on `components.json`. Each
 *     entry is keyed by `{ id, installPath }` so the same component can live in
 *     several workspace packages (monorepo-safe) without collisions. The per-file
 *     `{ sha, installedAt }` map captures content hashes at install time, which is
 *     what later powers the 3-way diff/update (D15).
 *
 *   • The **audit chain** is the append-only `.agentskit/install-log.jsonl`
 *     (NDJSON). Each {@link AuditEntry} carries the SHA-256 of the *canonical* prior
 *     entry in `prevEntryHash`, hash-linking the log: tampering with, reordering, or
 *     deleting any entry breaks the chain at a detectable index (D9).
 *
 * Everything here is pure + deterministic: timestamps are injected (`now`), object
 * keys are canonicalised (recursively sorted) before hashing so the chain is
 * reproducible, and the only I/O is (de)serialisation of strings — the
 * real-filesystem append lives in the command layer. All throws reuse
 * {@link IntegrityError} (the repo forbids bare `new Error`).
 */
import type { AuditEntry, ComponentsConfig, FrameworkTarget, InstalledComponent } from './types'
import { sha256Hex } from './fetch'
import { IntegrityError } from './install'
import type { FileToWrite } from './install'

/**
 * Guard the per-file marker map: a duplicate relative path within a single
 * component install would silently collapse two files into one hash slot, masking
 * a real diff later. Reuse {@link IntegrityError} (the repo forbids bare
 * `new Error`).
 */
function assertUniquePaths(files: ReadonlyArray<FileToWrite>): void {
  const seen = new Set<string>()
  for (const f of files) {
    if (seen.has(f.path)) {
      throw new IntegrityError(`duplicate file path in install marker: ${JSON.stringify(f.path)}`)
    }
    seen.add(f.path)
  }
}

// ── Install marker — `installed[]` on components.json (D15) ─────────────────

/** A marker entry is identified by this composite key (monorepo-safe). */
function sameKey(entry: InstalledComponent, id: string, installPath: string): boolean {
  return entry.id === id && entry.installPath === installPath
}

/**
 * Add `entry`, or replace the existing one with the same `{ id, installPath }`.
 * Returns a new config (immutably) — the input is never mutated. Order is stable:
 * a replacement keeps its slot; a new entry is appended.
 */
export function upsertInstalled(config: ComponentsConfig, entry: InstalledComponent): ComponentsConfig {
  const current = config.installed ?? []
  const idx = current.findIndex((e) => sameKey(e, entry.id, entry.installPath))
  const installed =
    idx === -1 ? [...current, entry] : current.map((e, i) => (i === idx ? entry : e))
  return { ...config, installed }
}

/** Find the recorded install for `{ id, installPath }`, or `undefined`. */
export function findInstalled(
  config: ComponentsConfig,
  id: string,
  installPath: string,
): InstalledComponent | undefined {
  return (config.installed ?? []).find((e) => sameKey(e, id, installPath))
}

/**
 * Remove the recorded install for `{ id, installPath }`. Returns a new config
 * (immutably); a no-op when the entry is absent.
 */
export function removeInstalled(config: ComponentsConfig, id: string, installPath: string): ComponentsConfig {
  const current = config.installed ?? []
  return { ...config, installed: current.filter((e) => !sameKey(e, id, installPath)) }
}

/**
 * Build an {@link InstalledComponent} marker for a just-written component. The
 * per-file map records the SHA-256 (hex) of each file's content at install time —
 * the basis for the later 3-way diff. `now` is injected (never `Date.now()`) so
 * the result is deterministic and testable.
 */
export function buildInstalledComponent(args: {
  id: string
  framework: FrameworkTarget
  installPath: string
  ref: string
  version: string
  files: ReadonlyArray<FileToWrite>
  now: string
}): InstalledComponent {
  assertUniquePaths(args.files)
  const files: Record<string, { sha: string; installedAt: string }> = {}
  for (const f of args.files) {
    files[f.path] = { sha: sha256Hex(f.content), installedAt: args.now }
  }
  return {
    id: args.id,
    kind: 'component',
    framework: args.framework,
    installPath: args.installPath,
    ref: args.ref,
    version: args.version,
    files,
  }
}

// ── Canonical JSON — recursively sorted keys (reproducible hashing) ─────────

/**
 * Recursively sort object keys so two structurally-equal values serialise
 * identically regardless of key insertion order. Arrays keep their order (it is
 * semantic); objects are rebuilt with sorted keys; primitives pass through.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/** Canonical JSON string of a value (keys sorted recursively). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

/** SHA-256 (hex) of the canonical JSON of an audit entry. */
function hashEntry(entry: AuditEntry): string {
  return sha256Hex(canonicalJson(entry))
}

// ── Audit chain — `.agentskit/install-log.jsonl` (D9) ──────────────────────

/**
 * Link a new entry onto the chain: its `prevEntryHash` is the SHA-256 of the
 * canonical last prior entry (`''` when the log is empty). Returns the completed
 * {@link AuditEntry}; `prevEntries` is not mutated.
 */
export function appendAudit(
  prevEntries: ReadonlyArray<AuditEntry>,
  entry: Omit<AuditEntry, 'prevEntryHash'>,
): AuditEntry {
  const prev = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1] : undefined
  const prevEntryHash = prev ? hashEntry(prev) : ''
  return { ...entry, prevEntryHash }
}

/** Serialise the chain to NDJSON (one JSON object per line, trailing newline). */
export function serializeAuditLog(entries: ReadonlyArray<AuditEntry>): string {
  if (entries.length === 0) return ''
  return `${entries.map((e) => JSON.stringify(e)).join('\n')}\n`
}

/**
 * Parse NDJSON back into entries, skipping blank lines and silently dropping any
 * line that is not a well-formed JSON object. (Verification of the *chain* itself
 * is {@link verifyAuditChain}'s job — parsing only rejects unstructured noise.)
 */
export function parseAuditLog(raw: string): AuditEntry[] {
  const out: AuditEntry[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      out.push(parsed as AuditEntry)
    }
  }
  return out
}

/**
 * Walk the chain, recomputing each entry's expected `prevEntryHash` from the prior
 * entry. The first entry must carry `''`. Returns `{ ok, brokenAt }` where
 * `brokenAt` is the index of the first entry whose link does not match (or `null`
 * when the whole chain is intact). Detects tampering, reordering, and deletion.
 */
export function verifyAuditChain(entries: ReadonlyArray<AuditEntry>): { ok: boolean; brokenAt: number | null } {
  for (let i = 0; i < entries.length; i++) {
    const expected = i === 0 ? '' : hashEntry(entries[i - 1])
    if (entries[i].prevEntryHash !== expected) {
      return { ok: false, brokenAt: i }
    }
  }
  return { ok: true, brokenAt: null }
}
