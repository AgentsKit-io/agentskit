import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { samePath } from './paths'

/**
 * File URL ↔ path conversion. `new URL(import.meta.url).pathname` yields
 * `/C:/repo/x` on Windows, which is not a valid path; always convert with
 * these instead.
 */

/** `file:` URL (string or URL) → native absolute path. */
export function fileUrlToPath(url: string | URL): string {
  return fileURLToPath(url)
}

/** Native path → `file:` URL string (what dynamic `import()` needs on Windows). */
export function pathToFileUrl(path: string): string {
  return pathToFileURL(resolve(path)).href
}

/** Directory of the current module, from `import.meta.url`. */
export function moduleDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl))
}

/**
 * True when the module is the process entry point (`node script.mjs`),
 * the portable replacement for `import.meta.url === \`file://${process.argv[1]}\``.
 */
export function isMainModule(importMetaUrl: string, argv: readonly string[] = process.argv): boolean {
  const entry = argv[1]
  if (!entry) return false
  return samePath(resolve(entry), fileURLToPath(importMetaUrl))
}
