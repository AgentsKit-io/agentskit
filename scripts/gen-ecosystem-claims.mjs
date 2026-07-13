#!/usr/bin/env node
/**
 * Generate the evidence-backed claim ledger consumed by documentation and
 * marketing surfaces. The output is deterministic: no timestamps and no
 * runtime network calls. Use --check in CI to reject stale snapshots.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeStats, REPO_ROOT } from './compute-stats.mjs'
import { buildEcosystemClaims } from './lib/ecosystem-contract.mjs'

const check = process.argv.includes('--check')
const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'ecosystem.json'), 'utf8'))
const claims = buildEcosystemClaims(manifest, computeStats())
const json = JSON.stringify(claims, null, 2) + '\n'
const targets = [
  'ecosystem-claims.json',
  'apps/docs-next/lib/ecosystem-claims.snapshot.json',
  'apps/landing/lib/ecosystem-claims.snapshot.json',
]

let stale = false
for (const relativePath of targets) {
  const target = join(REPO_ROOT, relativePath)
  if (check) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== json) {
      console.error(`ecosystem claims drift: ${relativePath} is stale — run gen-ecosystem-claims.`)
      stale = true
    } else {
      console.log(`ecosystem claims ok: ${relativePath}`)
    }
  } else {
    writeFileSync(target, json)
    console.log('wrote', relativePath)
  }
}

if (stale) process.exit(1)
