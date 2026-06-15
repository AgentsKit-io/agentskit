#!/usr/bin/env node
/**
 * Coverage-floor gate.
 *
 * Ties each package's configured vitest `linesThreshold` to its stability tier,
 * so a package can't claim a tier its test bar doesn't back. Floors:
 *
 *   stable → 90   beta → 70   alpha → 50
 *
 * This checks the *configured* threshold (static), not live coverage — the
 * vitest `test:coverage` job enforces that actual ≥ configured. Together they
 * guarantee actual coverage ≥ the tier floor.
 *
 * If a package omits `linesThreshold`, the shared default (90, see
 * vitest.shared.ts) applies.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')
const FLOOR = { stable: 90, beta: 70, alpha: 50 }
const SHARED_DEFAULT = 90

const errors = []
let checked = 0

for (const name of readdirSync(pkgsDir)) {
  const dir = join(pkgsDir, name)
  let pkg
  try {
    pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  } catch {
    continue
  }
  const tier = pkg.agentskit?.stability
  if (!tier || !(tier in FLOOR)) continue // tier validity is check-stability-tier's job

  const cfgPath = join(dir, 'vitest.config.ts')
  let threshold = SHARED_DEFAULT
  if (existsSync(cfgPath)) {
    const m = readFileSync(cfgPath, 'utf8').match(/linesThreshold:\s*(\d+)/)
    if (m) threshold = Number(m[1])
  }

  const floor = FLOOR[tier]
  if (threshold < floor) {
    errors.push(`${pkg.name}: ${tier} requires linesThreshold ≥ ${floor}, found ${threshold}`)
  }
  checked++
}

if (errors.length > 0) {
  console.error(
    '\nCoverage-floor check failed (raise the threshold and the actual coverage, or lower the tier):\n' +
      errors.map(e => `  - ${e}`).join('\n') +
      '\n',
  )
  process.exit(1)
}
console.log(`coverage thresholds meet their tier floor across ${checked} packages ✓`)
