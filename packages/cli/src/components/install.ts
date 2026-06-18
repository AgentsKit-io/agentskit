/**
 * Path-containment guard + transactional file writer (RFC-0006 D16/D10).
 *
 * `sha256` verifies file *content* and the signed manifest verifies the checksum
 * list — but neither constrains *where* a file is written. A valid-checksum entry
 * with `path: '../../.env'` would escape the target via `join`. D16 closes that:
 * every registry path is validated (no absolute, no `..`) and every resolved
 * destination is asserted to stay inside the target dir, on both the write and the
 * diff-read paths.
 *
 * `commitFiles` adds the D10 transactional property at the unit level: validate
 * ALL paths + collect ALL conflicts before writing ANY file, then write, rolling
 * back everything written so far if any write fails. (The real-filesystem adapter
 * layers the sibling temp-dir + atomic rename on top; the all-or-nothing semantics
 * and the containment guard live here, fully testable.)
 */
import { isAbsolute, resolve, sep } from 'node:path'

/** Raised on a path-traversal / unsafe-path / unresolved-conflict violation. */
export class IntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IntegrityError'
  }
}

/**
 * Publish-time path validation: a registry file path must be relative and contain
 * no `..` segment (and no empty/`.`-only segment). Pure predicate — the authoring
 * tooling rejects a manifest that fails this; the CLI re-checks at install.
 */
export function isSafeRegistryPath(rel: string): boolean {
  if (rel === '' || isAbsolute(rel)) return false
  const segments = rel.split(/[/\\]/)
  for (const s of segments) {
    if (s === '' || s === '.' || s === '..') return false
  }
  return true
}

/**
 * Resolve `rel` under `targetDir` and assert the result stays within it (D16).
 * Throws {@link IntegrityError} on an unsafe path or an escape; otherwise returns
 * the absolute destination. Use on every write AND every diff read.
 */
export function assertContained(targetDir: string, rel: string): string {
  if (!isSafeRegistryPath(rel)) {
    throw new IntegrityError(`unsafe registry path rejected: ${JSON.stringify(rel)}`)
  }
  const base = resolve(targetDir)
  const dest = resolve(base, rel)
  if (dest !== base && !dest.startsWith(base + sep)) {
    throw new IntegrityError(`path escapes the target directory: ${JSON.stringify(rel)}`)
  }
  return dest
}

/** Minimal filesystem surface for the writer. Injectable for tests. */
export interface WriteFs {
  exists: (path: string) => boolean
  /** Write `content`, creating parent directories as needed. */
  write: (path: string, content: string) => void
  /** Remove a file (used for rollback). */
  remove: (path: string) => void
}

/** A file to install, with its path relative to the target directory. */
export interface FileToWrite {
  path: string
  content: string
}

export interface CommitOptions {
  /** Overwrite files that already exist. Default: abort on any conflict. */
  force?: boolean
}

export interface CommitResult {
  /** Absolute destinations written, in order. */
  written: string[]
}

/**
 * Install `files` into `targetDir` transactionally:
 *   1. validate + contain every path (D16) — any failure aborts before any write;
 *   2. collect ALL pre-existing conflicts — abort listing them unless `force`;
 *   3. write; if any write throws, roll back everything written and rethrow.
 *
 * Never leaves a partially-written tree.
 */
export function commitFiles(
  fs: WriteFs,
  targetDir: string,
  files: ReadonlyArray<FileToWrite>,
  options: CommitOptions = {},
): CommitResult {
  // 1 — resolve + contain every destination first.
  const planned = files.map((f) => ({ dest: assertContained(targetDir, f.path), content: f.content, rel: f.path }))

  // 2 — collect all conflicts up front (no throw-on-first).
  if (!options.force) {
    const conflicts = planned.filter((p) => fs.exists(p.dest)).map((p) => p.rel)
    if (conflicts.length > 0) {
      throw new IntegrityError(
        `refusing to overwrite ${conflicts.length} existing file(s) (use --force): ${conflicts.join(', ')}`,
      )
    }
  }

  // 3 — write, rolling back on any failure.
  const written: string[] = []
  try {
    for (const p of planned) {
      fs.write(p.dest, p.content)
      written.push(p.dest)
    }
  } catch (err) {
    for (const dest of written.reverse()) {
      try {
        fs.remove(dest)
      } catch {
        // best-effort rollback; surface the original error below
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    throw new IntegrityError(`install failed and was rolled back (${written.length} file(s) removed): ${message}`)
  }

  return { written }
}
