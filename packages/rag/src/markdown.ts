/**
 * Markdown note parsing for knowledge-base style workspaces: YAML frontmatter,
 * `[[wikilinks]]` (with `#heading` and `|alias`), heading sections and
 * GitHub-flavored tables. Pure and synchronous; no filesystem access.
 */
import { parse as parseYaml } from 'yaml'

/** Result of {@link splitFrontmatter}. */
export interface FrontmatterSplit {
  frontmatter: Record<string, unknown>
  body: string
  /** Set when a frontmatter block exists but is not valid YAML; `frontmatter` is then `{}`. */
  frontmatterError?: string
}

/** One heading-delimited section. Level `0` is the preamble before the first heading. */
export interface MarkdownSection {
  level: number
  heading: string
  content: string
}

/** Result of {@link parseNote}. */
export interface MarkdownNote {
  path: string
  title: string
  frontmatter: Record<string, unknown>
  body: string
  /** Unique wikilink targets in order of first appearance, including links in frontmatter values. */
  links: string[]
  frontmatterError?: string
}

const FRONTMATTER = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/
const WIKILINK = /!?\[\[([^\]\n]*?)\]\]/g
const FENCE = /^ {0,3}(`{3,}|~{3,})/
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_DELIMITER = /^\s*\|?(\s*:?-+:?\s*\|)+\s*(:?-+:?\s*)?$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Split a leading `---` YAML block from the body. A non-mapping YAML document
 * yields `{}`; invalid YAML yields `{}` plus `frontmatterError`. Never throws.
 */
export function splitFrontmatter(raw: string): FrontmatterSplit {
  const match = FRONTMATTER.exec(raw)
  if (!match) return { frontmatter: {}, body: raw }
  const body = raw.slice(match[0].length)
  try {
    const parsed: unknown = parseYaml(match[1] ?? '')
    return { frontmatter: isRecord(parsed) ? parsed : {}, body }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { frontmatter: {}, body, frontmatterError: message }
  }
}

interface ParsedLink {
  target: string
  alias?: string
}

function parseLinkInner(inner: string): ParsedLink {
  const pipe = inner.search(/\\?\|/)
  const ref = pipe === -1 ? inner : inner.slice(0, pipe)
  const alias = pipe === -1 ? undefined : inner.slice(pipe).replace(/^\\?\|/, '')
  const hash = ref.indexOf('#')
  const target = (hash === -1 ? ref : ref.slice(0, hash)).trim()
  return alias === undefined ? { target } : { target, alias: alias.trim() }
}

/**
 * Return unique link targets from `[[Target]]`, `[[Target|Alias]]`,
 * `[[Target#Heading]]` and embeds `![[Target]]`. Same-note links (`[[#H]]`)
 * are skipped. Escaped pipes (`[[A\|B]]`, as used inside tables) are supported.
 */
export function extractWikilinks(text: string): string[] {
  const out = new Set<string>()
  for (const match of text.matchAll(WIKILINK)) {
    const { target } = parseLinkInner(match[1] ?? '')
    if (target) out.add(target)
  }
  return [...out]
}

/** Replace each wikilink by its alias, else its target, else (same-note link) its heading. */
export function stripWikilinks(text: string): string {
  return text.replace(WIKILINK, (whole, inner: string) => {
    const { target, alias } = parseLinkInner(inner)
    if (alias) return alias
    if (target) return target
    const heading = inner.replace(/^#/, '').trim()
    return heading || whole
  })
}

/**
 * Split a markdown body into ATX-heading sections. Headings inside fenced code
 * blocks are ignored. The first entry is always the level-0 preamble.
 */
export function sections(body: string): MarkdownSection[] {
  const out: Array<{ level: number; heading: string; lines: string[] }> = [
    { level: 0, heading: '', lines: [] },
  ]
  let fence: string | null = null
  for (const line of body.split(/\r?\n/)) {
    const fenceMatch = FENCE.exec(line)
    if (fenceMatch) {
      const marker = fenceMatch[1] as string
      if (fence === null) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
    }
    const heading = fence === null && !fenceMatch ? HEADING.exec(line) : null
    if (heading) {
      out.push({ level: (heading[1] as string).length, heading: (heading[2] ?? '').trim(), lines: [] })
    } else {
      ;(out[out.length - 1] as { lines: string[] }).lines.push(line)
    }
  }
  return out.map(({ level, heading, lines }) => ({ level, heading, content: lines.join('\n').trim() }))
}

/** First section whose heading contains `headingQuery` (case- and accent-insensitive), or `null`. */
export function findSection(body: string, headingQuery: string): MarkdownSection | null {
  const query = normalize(headingQuery)
  return sections(body).find((s) => s.heading !== '' && normalize(s.heading).includes(query)) ?? null
}

function splitRow(line: string): string[] {
  const s = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
  const cells: string[] = []
  let cell = ''
  let linkDepth = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '\\' && s[i + 1] === '|') {
      cell += '|'
      i++
      continue
    }
    if (ch === '[' && s[i + 1] === '[') {
      linkDepth++
      cell += '[['
      i++
      continue
    }
    if (ch === ']' && s[i + 1] === ']' && linkDepth > 0) {
      linkDepth--
      cell += ']]'
      i++
      continue
    }
    if (ch === '|' && linkDepth === 0) {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += ch
  }
  cells.push(cell.trim())
  return cells
}

/**
 * Parse the first GitHub-flavored table (header row + delimiter row + body
 * rows) in `text`. Header names are converted with {@link plain}; cell values
 * are trimmed but otherwise raw. Missing header names become `col<i>`.
 */
export function parseTable(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i + 1 < lines.length; i++) {
    const headerLine = lines[i] as string
    const delimiterLine = lines[i + 1] as string
    if (!TABLE_ROW.test(headerLine) || !TABLE_DELIMITER.test(delimiterLine)) continue
    const header = splitRow(headerLine).map(plain)
    const rows: Array<Record<string, string>> = []
    for (let j = i + 2; j < lines.length && TABLE_ROW.test(lines[j] as string); j++) {
      const cells = splitRow(lines[j] as string)
      rows.push(Object.fromEntries(cells.map((cell, k) => [header[k] || `col${k}`, cell])))
    }
    return rows
  }
  return []
}

/** Lowercase, trim and strip diacritics, for tolerant comparisons. */
export function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Markdown inline text to plain text: wikilinks resolved, emphasis and code markers removed. */
export function plain(value: unknown): string {
  return stripWikilinks(String(value ?? ''))
    .replace(/\*\*|__|`/g, '')
    .replace(/\*(\S[^*]*)\*/g, '$1')
}

/**
 * Parse a full note. `title` is the first level-1 heading outside code fences,
 * falling back to the file name without its `.md` extension.
 */
export function parseNote(path: string, raw: string): MarkdownNote {
  const { frontmatter, body, frontmatterError } = splitFrontmatter(raw)
  const h1 = sections(body).find((s) => s.level === 1 && s.heading !== '')
  const fileName = path.split(/[\\/]/).pop() ?? path
  const title = (h1?.heading ?? fileName.replace(/\.md$/i, '')).trim()
  return {
    path,
    title,
    frontmatter,
    body,
    links: extractWikilinks(raw),
    ...(frontmatterError === undefined ? {} : { frontmatterError }),
  }
}
