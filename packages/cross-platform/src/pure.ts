// Browser- and edge-safe subset: no `node:` imports, no process or fs access.
export { getRuntimeInfo, isBun, isDeno, isLinux, isMacOS, isWindows } from './runtime'
export type { OsName, RuntimeInfo, RuntimeName } from './runtime'
export {
  basename,
  dirname,
  extname,
  isAbsolutePath,
  isPathInside,
  isWindowsStylePath,
  joinPosix,
  normalizePosix,
  relativePosix,
  resolvePosix,
  samePath,
  toPosix,
} from './paths'
export type { PathCompareOptions } from './paths'
export { hashText, normalizeEol, splitFrontmatter, splitLines, stripBom } from './text'
export type { Frontmatter, SplitLinesOptions } from './text'
