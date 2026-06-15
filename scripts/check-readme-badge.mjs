#!/usr/bin/env node
/**
 * README stability-badge gate.
 *
 * docs/STABILITY.md mandates that every package README displays a badge for its
 * tier. This asserts each package has a README, the README carries a
 * shields.io stability badge, and the badge's tier + color match the tier
 * declared in package.json. Pairs with check-stability-tier (which ties
 * package.json to the policy doc) so all three artifacts stay in lockstep.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')
const COLOR = { stable: 'brightgreen', beta: 'yellow', alpha: 'orange' }

const errors = []
let checked = 0

for (const name of readdirSync(pkgsDir)) {
  const dir = join(pkgsDir, name)
  const pkgPath = join(dir, 'package.json')
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    continue
  }
  const tier = pkg.agentskit?.stability
  if (!tier || !COLOR[tier]) continue // tier validity is check-stability-tier's job

  const readmePath = join(dir, 'README.md')
  if (!existsSync(readmePath)) {
    errors.push(`${pkg.name}: no README.md (must carry a ${tier} stability badge)`)
    continue
  }
  const readme = readFileSync(readmePath, 'utf8')
  const badge = readme.match(/stability-(\w+)-(brightgreen|yellow|orange|red)/)
  if (!badge) {
    errors.push(`${pkg.name}: README has no stability badge (expected stability-${tier}-${COLOR[tier]})`)
    continue
  }
  if (badge[1] !== tier) {
    errors.push(`${pkg.name}: README badge tier "${badge[1]}" ≠ package.json "${tier}"`)
  } else if (badge[2] !== COLOR[tier]) {
    errors.push(`${pkg.name}: README badge color "${badge[2]}" ≠ expected "${COLOR[tier]}" for ${tier}`)
  }
  checked++
}

if (errors.length > 0) {
  console.error('\nREADME stability-badge check failed:\n' + errors.map(e => `  - ${e}`).join('\n') + '\n')
  process.exit(1)
}
console.log(`README badges match declared tiers across ${checked} packages ✓`)
