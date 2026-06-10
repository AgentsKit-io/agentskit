#!/usr/bin/env node
/**
 * Generate the committed ecosystem-stats snapshot consumed by every app in this
 * repo (docs-next serves it at /api/stats.json; landing reads it for copy).
 * Single derivation (compute-stats.mjs) → identical snapshots → no drift.
 *
 *   node scripts/gen-ecosystem-stats.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeStats, REPO_ROOT } from './compute-stats.mjs'

const stats = computeStats()
const json = JSON.stringify(stats, null, 2) + '\n'

const targets = [
  join(REPO_ROOT, 'apps', 'docs-next', 'lib', 'ecosystem-stats.snapshot.json'),
  join(REPO_ROOT, 'apps', 'landing', 'lib', 'ecosystem-stats.snapshot.json'),
]

for (const t of targets) {
  writeFileSync(t, json)
  console.log('wrote', t.replace(REPO_ROOT + '/', ''))
}
console.log('counts:', stats.counts)
