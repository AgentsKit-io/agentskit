/**
 * Line-ending helpers. Git on Windows (`core.autocrlf`) and Windows editors
 * turn `\n` into `\r\n`; anything that parses, compares or hashes text read
 * from disk or from a child process should go through these first.
 */

/** Convert `\r\n` and lone `\r` to `\n`. */
export function normalizeEol(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

/** Remove a leading UTF-8 byte-order mark. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

export interface SplitLinesOptions {
  /** Drop a final empty line produced by a trailing newline. Default true. */
  dropTrailingEmpty?: boolean
}

/** Split on `\n`, `\r\n` or `\r`. */
export function splitLines(text: string, options: SplitLinesOptions = {}): string[] {
  const lines = normalizeEol(text).split('\n')
  if ((options.dropTrailingEmpty ?? true) && lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

export interface Frontmatter {
  /** Raw frontmatter block without the `---` fences, or null when absent. */
  frontmatter: string | null
  /** Document body after the closing fence (or the whole text). */
  body: string
}

const FRONTMATTER = /^---[ \t]*\n([\s\S]*?)\n?---[ \t]*(?:\n|$)/

/**
 * Split a `---` fenced frontmatter block from a document. Tolerates CRLF
 * and a BOM. The block is returned raw; parse it with the YAML library of
 * your choice.
 */
export function splitFrontmatter(text: string): Frontmatter {
  const normalized = normalizeEol(stripBom(text))
  const match = FRONTMATTER.exec(normalized)
  if (!match) return { frontmatter: null, body: normalized }
  return { frontmatter: match[1] ?? '', body: normalized.slice(match[0].length) }
}

/**
 * SHA-256 of the text after EOL and BOM normalisation, as lowercase hex.
 * Identical on every OS for the same logical content. Uses Web Crypto, so
 * it works in Node, Bun, Deno, browsers and edge workers.
 */
export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeEol(stripBom(text)))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
