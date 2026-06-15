#!/usr/bin/env node
/**
 * CI gate: only named exports in package source. `export default` is
 * forbidden — named exports enable predictable refactors, tree-shaking, and
 * unambiguous re-exports across the monorepo.
 *
 * Template-literal contents are stripped first, so `export default` emitted
 * inside scaffolded user code (CLI init, templates, rule/prompt strings) is
 * ignored — only real module default exports are flagged.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ALLOW_FILES = new Set([
  // (none yet — codebase is default-export-free)
])

const root = process.cwd()

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    // .d.ts are declarations — `export default` is legitimate there (e.g.
    // Svelte component types `.svelte.d.ts`, ambient module shims).
    else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(abs)
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

const violations = []

for (const abs of all) {
  const rel = abs.slice(root.length + 1)
  if (ALLOW_FILES.has(rel)) continue

  const text = readFileSync(abs, 'utf8')
  const stripped = text
    .replace(/`(?:[^`\\]|\\.)*`/gs, '``')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

  const re = /\bexport\s+default\b/g
  let match
  while ((match = re.exec(stripped))) {
    const line = stripped.slice(0, match.index).split('\n').length
    violations.push(`${rel}:${line}`)
  }
}

if (violations.length > 0) {
  console.error('`export default` found in package source. Use named exports.')
  console.error('')
  for (const v of violations) console.error(`  ${v}`)
  console.error('')
  console.error(`${violations.length} violation(s).`)
  process.exit(1)
}

console.log(`Named-exports gate clean across ${all.length} files.`)
