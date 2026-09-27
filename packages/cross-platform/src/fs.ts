import { randomBytes } from 'node:crypto'
import { chmod, copyFile, cp, rm, stat, symlink, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { promisify } from 'node:util'
import gracefulFs from 'graceful-fs'
import { mapRuntimeError } from './errors'
import { isWindows } from './runtime'

// graceful-fs retries rename on Windows for up to 60s while antivirus,
// indexers or a lingering handle hold the file (EPERM/EACCES/EBUSY).
const gracefulRename = promisify(gracefulFs.rename)

export interface RemoveOptions {
  /** Retries for EBUSY/EPERM/ENOTEMPTY while handles close. Default 10. */
  maxRetries?: number
  /** Delay between retries in ms (linear backoff). Default 100. */
  retryDelay?: number
}

/** `rm -rf` that survives Windows file locks. Missing paths are not an error. */
export async function removePath(path: string, options: RemoveOptions = {}): Promise<void> {
  try {
    await rm(path, {
      recursive: true,
      force: true,
      maxRetries: options.maxRetries ?? 10,
      retryDelay: options.retryDelay ?? 100,
    })
  } catch (error) {
    throw mapRuntimeError(error, 'write', path)
  }
}

/** `rename` that retries while Windows holds a lock on source or target. */
export async function renamePath(from: string, to: string): Promise<void> {
  try {
    await gracefulRename(from, to)
  } catch (error) {
    throw mapRuntimeError(error, 'write', to)
  }
}

export interface WriteAtomicOptions {
  encoding?: BufferEncoding
  mode?: number
}

/**
 * Write a file atomically: write a temp file beside the target (same volume,
 * so the rename cannot fail with EXDEV) and rename it into place.
 */
export async function writeFileAtomic(path: string, data: string | Uint8Array, options: WriteAtomicOptions = {}): Promise<void> {
  const temp = join(dirname(path), `.${basename(path)}.${randomBytes(6).toString('hex')}.tmp`)
  try {
    await writeFile(temp, data, { encoding: options.encoding, mode: options.mode })
    await renamePath(temp, path)
  } catch (error) {
    await unlink(temp).catch(() => {})
    throw mapRuntimeError(error, 'write', path)
  }
}

export type LinkKind = 'symlink' | 'junction' | 'copy'

/**
 * Create a symlink, degrading gracefully on Windows where symlinks need
 * Developer Mode or admin rights: directories fall back to a junction (no
 * privilege needed), files to a copy. Returns what was created.
 */
export async function createSymlink(target: string, path: string): Promise<LinkKind> {
  const isDirectory = await stat(target).then(info => info.isDirectory(), () => false)
  try {
    await symlink(target, path, isDirectory ? 'dir' : 'file')
    return 'symlink'
  } catch (error) {
    const code = (error as { code?: string }).code
    if (!isWindows || (code !== 'EPERM' && code !== 'EACCES')) throw mapRuntimeError(error, 'write', path)
  }
  if (isDirectory) {
    await symlink(target, path, 'junction')
    return 'junction'
  }
  await copyFile(target, path)
  return 'copy'
}

/** Copy a file or directory tree (`fs.cp`, recursive). */
export async function copyPath(from: string, to: string): Promise<void> {
  try {
    await cp(from, to, { recursive: true, force: true })
  } catch (error) {
    throw mapRuntimeError(error, 'write', to)
  }
}

/**
 * Apply POSIX permission bits. Windows has no mode bits (only read-only),
 * so this is a no-op there; returns whether the mode was applied. Never use
 * mode bits as a security boundary on Windows.
 */
export async function setFileMode(path: string, mode: number): Promise<boolean> {
  if (isWindows) return false
  try {
    await chmod(path, mode)
    return true
  } catch (error) {
    throw mapRuntimeError(error, 'write', path)
  }
}
