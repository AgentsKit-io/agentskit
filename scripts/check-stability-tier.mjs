#!/usr/bin/env node
/**
 * Stability-tier integrity gate.
 *
 * Every package must declare a stability tier, the value must be one of the
 * three tiers defined in docs/STABILITY.md, and it must match that package's
 * row in the STABILITY.md "Current tier map" table. This keeps the policy
 * document (the single source of truth consumers read), the package metadata,
 * and — together with check-readme-badge — the README badges from ever drifting.
 *
 * Catches: a missing `agentskit.stability` field, an undefined tier value
 * (e.g. "experimental"), a package absent from the tier map, a stale map row,
 * and a map row with no matching package.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')
const VALID = new Set(['alpha', 'beta', 'stable'])

const errors = []

// 1. Declared tiers from each package.json
const declared = new Map()
for (const name of readdirSync(pkgsDir)) {
  const pkgPath = join(pkgsDir, name, 'package.json')
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    continue // not a package dir
  }
  if (pkg.private) continue // private/internal packages aren't published — exempt from publish gates
  const tier = pkg.agentskit?.stability
  if (!tier) {
    errors.push(`${pkg.name}: no agentskit.stability declared in package.json`)
    continue
  }
  if (!VALID.has(tier)) {
    errors.push(`${pkg.name}: invalid tier "${tier}" — must be one of alpha | beta | stable`)
  }
  declared.set(pkg.name, tier)
}

// 2. Tier map from docs/STABILITY.md
const stab = readFileSync(join(root, 'docs', 'STABILITY.md'), 'utf8')
const mapped = new Map()
const rowRe = /^\|\s*`(@agentskit\/[\w-]+)`\s*\|\s*`(\w+)`\s*\|/gm
let m
while ((m = rowRe.exec(stab)) !== null) mapped.set(m[1], m[2])

// 3. Cross-check
for (const [name, tier] of declared) {
  if (!mapped.has(name)) {
    errors.push(`${name}: declared "${tier}" but missing from docs/STABILITY.md tier map`)
  } else if (mapped.get(name) !== tier) {
    errors.push(`${name}: package.json says "${tier}" but STABILITY.md map says "${mapped.get(name)}"`)
  }
}
for (const name of mapped.keys()) {
  if (!declared.has(name)) {
    errors.push(`${name}: in STABILITY.md tier map but no such package found`)
  }
}

if (errors.length > 0) {
  console.error('\nStability-tier integrity check failed:\n' + errors.map(e => `  - ${e}`).join('\n') + '\n')
  process.exit(1)
}
console.log(`stability tiers consistent across ${declared.size} packages ✓`)
