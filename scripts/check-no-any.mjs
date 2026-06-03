#!/usr/bin/env node
/**
 * CI gate: the explicit `any` type is forbidden in package source. Use
 * `unknown` and narrow, or a precise type. TypeScript strict mode is on;
 * `any` silently disables it at a boundary.
 *
 * Detection strips template-literal contents and comments first, so `any`
 * appearing in scaffolded code (backtick strings) or prose is ignored — only
 * real type positions are flagged:
 *   `: any`   `as any`   `<any>`   `any[]`   `Array<any>`
 *
 * If a third-party type genuinely forces `any`, isolate it behind a typed
 * wrapper rather than widening the public surface, or add to ALLOW_FILES with
 * a one-line justification.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ALLOW_FILES = new Set([
  // (none yet — codebase is any-free)
])

const root = process.cwd()

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(abs)
  }
  return out
}

const packagesDir = join(root, 'packages')
const all = []
for (const pkg of readdirSync(packagesDir)) {
  const srcDir = join(packagesDir, pkg, 'src')
  try {
    if (!statSync(srcDir).isDirectory()) continue
  } catch {
    continue
  }
  walk(srcDir, all)
}

// Type positions where `any` is a real annotation, not an identifier or prose.
const PATTERNS = [
  /:\s*any\b/g,
  /\bas\s+any\b/g,
  /<\s*any\s*>/g,
  /\bany\[\]/g,
  /Array<\s*any\s*>/g,
]

const violations = []

for (const abs of all) {
  const rel = abs.slice(root.length + 1)
  if (ALLOW_FILES.has(rel)) continue

  const text = readFileSync(abs, 'utf8')
  // Strip backtick template contents, block comments, and line comments —
  // `any` inside scaffold code or documentation is not a real type.
  const stripped = text
    .replace(/`(?:[^`\\]|\\.)*`/gs, '``')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

  for (const re of PATTERNS) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(stripped))) {
      const line = stripped.slice(0, match.index).split('\n').length
      violations.push(`${rel}:${line} — ${match[0].trim()}`)
    }
  }
}

if (violations.length > 0) {
  console.error('Explicit `any` found in package source. Use `unknown` and narrow.')
  console.error('')
  for (const v of violations) console.error(`  ${v}`)
  console.error('')
  console.error(`${violations.length} violation(s).`)
  process.exit(1)
}

console.log(`No-any gate clean across ${all.length} files.`)
