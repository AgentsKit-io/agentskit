import { isAbsolute, resolve, relative, sep } from 'node:path'
import { ErrorCodes, ToolError } from '@agentskit/core'
import type { ToolDefinition } from '@agentskit/core'

export interface FilesystemConfig {
  basePath: string
  /**
   * When true, refuse to operate on symlinks at all (read, write,
   * list). Default true — symlinks inside basePath can target outside
   * the jail and would otherwise leak access. Set false only if you
   * trust the contents of basePath.
   */
  denySymlinks?: boolean
}

function isInside(base: string, target: string): boolean {
  if (base === target) return true
  const rel = relative(base, target)
  if (rel === '' || rel === '.') return true
  if (rel.startsWith('..')) return false
  if (isAbsolute(rel)) return false
  // On Windows, relative('C:\\base', 'D:\\other') returns 'D:\\other'.
  // isAbsolute already catches that.
  // Reject any '..' segment in the relative path (defensive).
  const parts = rel.split(sep)
  return !parts.includes('..')
}

function jailPath(basePath: string, inputPath: string): string {
  const resolved = resolve(basePath, inputPath)
  if (!isInside(basePath, resolved)) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: `Access denied: "${inputPath}" is outside the allowed base path`,
      hint: 'Pass paths relative to the configured basePath; absolute paths and ../ traversal are rejected.',
    })
  }
  return resolved
}

async function canonicalBase(basePath: string): Promise<string> {
  const fs = await import('node:fs/promises')
  try {
    return await fs.realpath(basePath)
  } catch {
    return basePath
  }
}

async function realJailPath(
  basePath: string,
  inputPath: string,
  opts: { denySymlinks: boolean; mustExist: boolean },
): Promise<string> {
  const fs = await import('node:fs/promises')
  const canonical = await canonicalBase(basePath)
  const initial = jailPath(canonical, inputPath)
  // Resolve symlinks to their real targets so a symlink whose target
  // sits outside the jail is rejected. For write-new-file calls the
  // leaf may not exist yet — fall back to checking the parent.
  let real: string
  try {
    real = await fs.realpath(initial)
  } catch (err) {
    if (opts.mustExist) throw err as Error
    // Walk up until we find an existing ancestor we can realpath; then
    // rejoin the trailing segments. Handles deep new-directory writes.
    const path = await import('node:path')
    const trailing: string[] = []
    let cursor = initial
    while (true) {
      trailing.unshift(path.basename(cursor))
      const parent = path.dirname(cursor)
      if (parent === cursor) {
        real = initial
        break
      }
      try {
        const parentReal = await fs.realpath(parent)
        real = resolve(parentReal, ...trailing)
        break
      } catch {
        cursor = parent
      }
    }
  }
  if (!isInside(canonical, real)) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: `Access denied: "${inputPath}" resolves outside the allowed base path (symlink escape blocked)`,
      hint: 'A symlink inside basePath was pointing outside it. Move the target inside basePath or remove the symlink.',
    })
  }
  if (opts.denySymlinks) {
    try {
      const stat = await fs.lstat(initial)
      if (stat.isSymbolicLink()) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `Access denied: "${inputPath}" is a symbolic link`,
          hint: 'Symlinks are disabled for this filesystem tool. Set denySymlinks:false to allow them.',
        })
      }
    } catch (err) {
      if (opts.mustExist) throw err as Error
      // leaf doesn't exist yet — fine
    }
  }
  return real
}

export function filesystem(config: FilesystemConfig): ToolDefinition[] {
  const basePath = resolve(config.basePath)
  const denySymlinks = config.denySymlinks ?? true

  const readFile: ToolDefinition = {
    name: 'read_file',
    description: 'Read the contents of a file. Path is relative to the workspace.',
    tags: ['filesystem', 'read'],
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to workspace' },
      },
      required: ['path'],
    },
    execute: async (args) => {
      const fs = await import('node:fs/promises')
      const filePath = await realJailPath(basePath, String(args.path ?? ''), {
        denySymlinks,
        mustExist: true,
      })
      return await fs.readFile(filePath, 'utf8')
    },
  }

  const writeFile: ToolDefinition = {
    name: 'write_file',
    description: 'Write content to a file. Creates the file if it does not exist. Path is relative to the workspace.',
    tags: ['filesystem', 'write'],
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to workspace' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
    execute: async (args) => {
      const fs = await import('node:fs/promises')
      const { dirname } = await import('node:path')
      const filePath = await realJailPath(basePath, String(args.path ?? ''), {
        denySymlinks,
        mustExist: false,
      })
      await fs.mkdir(dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, String(args.content ?? ''), 'utf8')
      return `Written to ${args.path}`
    },
  }

  const listDirectory: ToolDefinition = {
    name: 'list_directory',
    description: 'List files and directories at a path. Path is relative to the workspace.',
    tags: ['filesystem', 'read'],
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path relative to workspace (default: root)' },
      },
    },
    execute: async (args) => {
      const fs = await import('node:fs/promises')
      const dirPath = await realJailPath(basePath, String(args.path ?? '.'), {
        denySymlinks,
        mustExist: true,
      })
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      return entries
        .map(e => `${e.isDirectory() ? '[dir] ' : ''}${e.name}`)
        .join('\n')
    },
  }

  return [readFile, writeFile, listDirectory]
}
