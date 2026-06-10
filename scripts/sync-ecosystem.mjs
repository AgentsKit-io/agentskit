#!/usr/bin/env node
/**
 * sync-ecosystem — distribute the canonical ecosystem.json (the registry of the
 * AgentsKit web properties) into each app that consumes it. Copies, never
 * hand-edited; --check fails if a copy is stale (the drift gate).
 *
 * The same ecosystem.json is also copied verbatim into sibling repos (akos,
 * playbook, registry) in their own Phase-1 PRs, so every property renders the
 * ecosystem bar + llms.txt block from one source.
 *
 *   node scripts/sync-ecosystem.mjs
 *   node scripts/sync-ecosystem.mjs --check
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const canonical = readFileSync(join(root, 'ecosystem.json'), 'utf8')
const check = process.argv.includes('--check')

const targets = [
  join(root, 'apps', 'docs-next', 'lib', 'ecosystem.json'),
  join(root, 'apps', 'landing', 'lib', 'ecosystem.json'),
]

let drift = false
for (const t of targets) {
  const rel = t.replace(root + '/', '')
  if (check) {
    const cur = existsSync(t) ? readFileSync(t, 'utf8') : ''
    if (cur !== canonical) { console.error(`ecosystem drift: ${rel} stale — run sync-ecosystem.`); drift = true }
    else console.log(`ecosystem ok: ${rel}`)
  } else {
    writeFileSync(t, canonical)
    console.log('wrote', rel)
  }
}

if (check && drift) process.exit(1)
