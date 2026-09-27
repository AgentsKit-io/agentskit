import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve } from 'pathe'
import { isWindows } from './runtime'

/**
 * Path helpers that always speak forward slashes, whatever the host OS.
 * Built on `pathe` (drop-in `node:path` API with POSIX output) so a path
 * produced on Windows compares equal to the same path produced on Linux.
 */

/** Replace every backslash with a forward slash. Nothing else changes. */
export function toPosix(path: string): string {
  return path.replace(/\\/g, '/')
}

/** Normalise `.`/`..` segments and separators; output uses `/`. */
export function normalizePosix(path: string): string {
  return normalize(path)
}

/** `path.join` with `/` output on every OS. */
export function joinPosix(...segments: string[]): string {
  return join(...segments)
}

/** `path.resolve` with `/` output on every OS. */
export function resolvePosix(...segments: string[]): string {
  return resolve(...segments)
}

/** `path.relative` with `/` output on every OS. */
export function relativePosix(from: string, to: string): string {
  return relative(from, to)
}

/** True for `/x`, `C:\x`, `C:/x` and `\\server\share` paths. */
export function isAbsolutePath(path: string): boolean {
  return isAbsolute(path)
}

const WINDOWS_STYLE = /^(?:[a-zA-Z]:[\\/]|\\\\|\/\/)/

/** True when the path is written in Windows form (drive letter or UNC). */
export function isWindowsStylePath(path: string): boolean {
  return WINDOWS_STYLE.test(path)
}

export interface PathCompareOptions {
  /**
   * Compare case-insensitively. Defaults to true on Windows hosts or when
   * either path is written in Windows form (NTFS is case-insensitive).
   */
  caseInsensitive?: boolean
}

function pathKey(path: string, caseInsensitive: boolean): string {
  const normalized = normalize(path)
  const trimmed = normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
  return caseInsensitive ? trimmed.toLowerCase() : trimmed
}

function resolveCaseInsensitive(a: string, b: string, options: PathCompareOptions): boolean {
  return options.caseInsensitive ?? (isWindows || isWindowsStylePath(a) || isWindowsStylePath(b))
}

/** True when both paths point to the same location, regardless of separators. */
export function samePath(a: string, b: string, options: PathCompareOptions = {}): boolean {
  const insensitive = resolveCaseInsensitive(a, b, options)
  return pathKey(a, insensitive) === pathKey(b, insensitive)
}

/** True when `child` is `parent` itself or lives below it. */
export function isPathInside(parent: string, child: string, options: PathCompareOptions = {}): boolean {
  const insensitive = resolveCaseInsensitive(parent, child, options)
  const parentKey = pathKey(parent, insensitive)
  const childKey = pathKey(child, insensitive)
  if (childKey === parentKey) return true
  const prefix = parentKey.endsWith('/') ? parentKey : `${parentKey}/`
  return childKey.startsWith(prefix)
}

export { basename, dirname, extname }
