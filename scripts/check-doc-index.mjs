#!/usr/bin/env node
/**
 * CI gate: ADR and RFC indexes stay in sync with the files on disk.
 *
 * For each registry (docs/architecture/adrs, rfcs):
 *   - every `NNNN-*.md` file must be linked from the registry's README.md
 *   - every link in the README pointing at `NNNN-*.md` must resolve to a file
 *
 * Catches the classic drift where an ADR/RFC lands but never makes the index
 * (invisible to agents), or the index references a renamed/removed file.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

const REGISTRIES = [
  { name: 'ADR', dir: 'docs/architecture/adrs' },
  { name: 'RFC', dir: 'rfcs' },
]

const violations = []

for (const { name, dir } of REGISTRIES) {
  const absDir = join(root, dir)
  if (!existsSync(absDir)) {
    violations.push(`${name}: directory ${dir} missing`)
    continue
  }
  const readmePath = join(absDir, 'README.md')
  if (!existsSync(readmePath)) {
    violations.push(`${name}: ${dir}/README.md missing`)
    continue
  }
  const readme = readFileSync(readmePath, 'utf8')

  const files = readdirSync(absDir).filter(
    f => /^\d{4}-.*\.md$/.test(f) && f.toLowerCase() !== 'readme.md',
  )

  // Files on disk → must be linked.
  for (const f of files) {
    if (!readme.includes(`(./${f})`) && !readme.includes(`(${f})`)) {
      violations.push(`${name}: ${dir}/${f} exists but is not linked in README.md index`)
    }
  }

  // Links in README → must resolve.
  const linkRe = /\(\.?\/?(\d{4}-[^)]+\.md)\)/g
  let m
  const seen = new Set()
  while ((m = linkRe.exec(readme))) {
    const target = m[1]
    if (seen.has(target)) continue
    seen.add(target)
    if (!existsSync(join(absDir, target))) {
      violations.push(`${name}: README.md links ${target} but the file does not exist`)
    }
  }
}

if (violations.length > 0) {
  console.error('ADR/RFC index is out of sync.')
  console.error('')
  for (const v of violations) console.error(`  ${v}`)
  console.error('')
  console.error(`${violations.length} violation(s).`)
  process.exit(1)
}

console.log('Doc-index gate clean (ADR + RFC indexes match disk).')
