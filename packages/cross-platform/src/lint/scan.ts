import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { toPosix } from '../paths'
import { splitLines } from '../text'
import { IGNORE_DIRECTIVE, PORTABILITY_RULES, type PortabilityRule } from './rules'

export interface Finding {
  file: string
  line: number
  rule: string
  message: string
  fix: string
}

export interface ScanOptions {
  /** Repository root; reported paths are relative to it, with `/`. */
  root: string
  /** Directories (relative to root) to scan. */
  include: readonly string[]
  /** Path prefixes (relative, `/`-separated) to skip. */
  exclude?: readonly string[]
  rules?: readonly PortabilityRule[]
}

const EXTENSIONS = /\.(?:[cm]?[jt]s|tsx|jsx)$/
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.next', '.turbo', '.git', '.source'])

/** Findings in one file's text. */
export function scanText(file: string, text: string, rules: readonly PortabilityRule[] = PORTABILITY_RULES): Finding[] {
  const findings: Finding[] = []
  const lines = splitLines(text, { dropTrailingEmpty: false })
  lines.forEach((line, index) => {
    if (IGNORE_DIRECTIVE.test(line) || (index > 0 && IGNORE_DIRECTIVE.test(lines[index - 1] ?? ''))) return
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        findings.push({ file, line: index + 1, rule: rule.id, message: rule.message, fix: rule.fix })
      }
    }
  })
  return findings
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else if (EXTENSIONS.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full)
  }
}

/** Scan the configured directories and return every finding, sorted by path. */
export async function scanRepository(options: ScanOptions): Promise<Finding[]> {
  const files: string[] = []
  for (const dir of options.include) await walk(join(options.root, dir), files)
  const exclude = options.exclude ?? []
  const findings: Finding[] = []
  for (const full of files.sort()) {
    const file = toPosix(relative(options.root, full))
    if (exclude.some(prefix => file.startsWith(prefix))) continue
    findings.push(...scanText(file, await readFile(full, 'utf8'), options.rules))
  }
  return findings
}
