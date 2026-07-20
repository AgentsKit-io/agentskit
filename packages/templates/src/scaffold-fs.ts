import {
  lstat,
  mkdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { randomBytes } from 'node:crypto'
import { invalidConfig } from './scaffold-config'

/** True when `child` is the same as or nested under `parent` after resolve. */
export function isPathInside(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

export async function lstatOrNull(
  path: string,
  lstatImpl: typeof lstat = lstat,
) {
  try {
    return await lstatImpl(path)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    throw err
  }
}

/** Reject a path whose final filesystem component is a symlink. */
export async function assertNotSymlink(
  path: string,
  label: string,
  lstatImpl: typeof lstat = lstat,
): Promise<void> {
  const st = await lstatOrNull(path, lstatImpl)
  if (st?.isSymbolicLink()) {
    throw invalidConfig(
      `Refusing to ${label} a symlink path: ${path}`,
      'Scaffold does not write through a symlink at the explicit dir or destination root.',
    )
  }
}

export function resolveScaffoldRoots(dir: string, name: string): {
  parentDir: string
  finalRoot: string
} {
  const parentDir = resolve(dir)
  const finalRoot = resolve(parentDir, name)
  if (!isPathInside(parentDir, finalRoot)) {
    throw invalidConfig(
      `Scaffold destination escapes dir: ${finalRoot}`,
      'Name must stay inside the resolved dir (path traversal is rejected).',
    )
  }
  if (finalRoot === parentDir) {
    throw invalidConfig('Scaffold destination must be a subdirectory of dir')
  }
  return { parentDir, finalRoot }
}

function siblingName(kind: 'stage' | 'backup', leaf: string): string {
  const token = randomBytes(8).toString('hex')
  const safe = leaf.replace(/[/\\]/g, '-')
  return `.agentskit-scaffold-${kind}-${safe}-${token}`
}

export interface PlannedFile {
  /** Path relative to package root (`src/index.ts`). */
  relativePath: string
  content: string
}

/** Optional filesystem hooks for tests (production uses node:fs/promises). */
export interface ScaffoldFsIo {
  mkdir: typeof mkdir
  writeFile: typeof writeFile
  rename: typeof rename
  rm: typeof rm
  lstat: typeof lstat
}

const defaultIo: ScaffoldFsIo = { mkdir, writeFile, rename, rm, lstat }

/**
 * Write files into a sibling staging directory, then atomically promote
 * to `finalRoot`. Existing destinations require `overwrite: true` and
 * are replaced via backup + rename with rollback on failure.
 * Returns final absolute paths in the same order as `files`.
 */
export async function writePackageAtomically(options: {
  parentDir: string
  finalRoot: string
  overwrite: boolean
  files: PlannedFile[]
  /** @internal test injection */
  io?: Partial<ScaffoldFsIo>
}): Promise<string[]> {
  const { parentDir, finalRoot, overwrite, files } = options
  const io: ScaffoldFsIo = { ...defaultIo, ...options.io }

  if (!isPathInside(parentDir, finalRoot) || finalRoot === parentDir) {
    throw invalidConfig(`Scaffold destination escapes parent: ${finalRoot}`)
  }

  await io.mkdir(parentDir, { recursive: true })
  await assertNotSymlink(parentDir, 'use', io.lstat)
  await assertNotSymlink(finalRoot, 'write into', io.lstat)

  const existing = await lstatOrNull(finalRoot, io.lstat)
  if (existing) {
    if (existing.isSymbolicLink()) {
      throw invalidConfig(
        `Refusing to overwrite a symlink destination: ${finalRoot}`,
      )
    }
    if (!overwrite) {
      throw invalidConfig(
        `Destination already exists: ${finalRoot}`,
        'Pass overwrite: true to replace, or choose a different name/dir.',
      )
    }
  }

  const leaf = finalRoot.slice(parentDir.length).replace(/^[/\\]+/, '') || 'pkg'
  const stagingRoot = join(parentDir, siblingName('stage', leaf))
  const finalPaths = files.map(f => join(finalRoot, f.relativePath))

  try {
    await io.mkdir(stagingRoot, { recursive: true })

    for (const file of files) {
      const full = join(stagingRoot, file.relativePath)
      if (!isPathInside(stagingRoot, full)) {
        throw invalidConfig(`Generated path escapes package root: ${file.relativePath}`)
      }
      await io.mkdir(dirname(full), { recursive: true })
      await io.writeFile(full, file.content, 'utf8')
    }

    if (existing && overwrite) {
      const backupRoot = join(parentDir, siblingName('backup', leaf))
      await io.rename(finalRoot, backupRoot)
      try {
        await io.rename(stagingRoot, finalRoot)
      } catch (err) {
        await io.rm(stagingRoot, { recursive: true, force: true }).catch(() => {})
        try {
          await io.rename(backupRoot, finalRoot)
        } catch (rollbackError) {
          throw invalidConfig(
            `Failed to promote scaffold and restore the previous destination: ${finalRoot}`,
            `The previous destination remains at ${backupRoot}; restore it manually before retrying.`,
            { promoteError: err, rollbackError },
          )
        }
        throw err
      }
      await io.rm(backupRoot, { recursive: true, force: true })
    } else {
      await io.rename(stagingRoot, finalRoot)
    }

    return finalPaths
  } catch (err) {
    await io.rm(stagingRoot, { recursive: true, force: true }).catch(() => {})
    throw err
  }
}
