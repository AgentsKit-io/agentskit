#!/usr/bin/env node
/**
 * CI gate: per-package source file-size budgets (lines of code). Oversized
 * files are hard for both humans and agents to reason about; the budget
 * forces extraction at the seams.
 *
 * Budgets are line counts, applied to `packages/<pkg>/src/**` (excluding
 * `*.test.ts`). `BUDGETS` overrides the default per package.
 *
 * BASELINE holds files that already exceed budget today; each is pinned to its
 * current size so it cannot grow, while new files are held to budget. Shrink
 * the baseline as files are split — never raise an entry.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_BUDGET = 400

const BUDGETS = {
  contracts: 200,
  core: 400,
  ui: 500,
  storage: 400,
}

// Files over budget at the time the gate landed. Pinned to current size:
// the gate fails if they grow, and the entry should be removed once the file
// is split back under its package budget.
const BASELINE = {
  'packages/cli/src/init.ts': 1553,
  'packages/adapters/src/utils.ts': 575,
  'packages/core/src/controller.ts': 555,
}

const root = process.cwd()

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(abs)
  }
  return out
}

const packagesDir = join(root, 'packages')
const violations = []
let scanned = 0

for (const pkg of readdirSync(packagesDir)) {
  const srcDir = join(packagesDir, pkg, 'src')
  try {
    if (!statSync(srcDir).isDirectory()) continue
  } catch {
    continue
  }
  const budget = BUDGETS[pkg] ?? DEFAULT_BUDGET
  for (const abs of walk(srcDir)) {
    scanned++
    const rel = abs.slice(root.length + 1)
    const lines = readFileSync(abs, 'utf8').split('\n').length
    const baseline = BASELINE[rel]
    if (baseline != null) {
      if (lines > baseline) {
        violations.push(`${rel}: ${lines} lines — exceeds its pinned baseline of ${baseline}. Split it; do not raise the baseline.`)
      }
      continue
    }
    if (lines > budget) {
      violations.push(`${rel}: ${lines} lines — over the ${budget}-line budget for "${pkg}". Extract a module.`)
    }
  }
}

if (violations.length > 0) {
  console.error('File-size budget exceeded.')
  console.error('')
  for (const v of violations) console.error(`  ${v}`)
  console.error('')
  console.error(`${violations.length} violation(s).`)
  process.exit(1)
}

console.log(`File-size gate clean across ${scanned} files.`)
