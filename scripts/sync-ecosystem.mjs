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
const ecosystem = JSON.parse(canonical)
const check = process.argv.includes('--check')

let drift = false

function step(rel, current, next) {
  if (check) {
    if (current !== next) { console.error(`ecosystem drift: ${rel} stale — run sync-ecosystem.`); drift = true }
    else console.log(`ecosystem ok: ${rel}`)
  } else {
    writeFileSync(join(root, rel), next)
    console.log('wrote', rel)
  }
}

// 1. Distribute the canonical registry into each consuming app.
for (const rel of ['apps/docs-next/lib/ecosystem.json', 'apps/landing/lib/ecosystem.json']) {
  const t = join(root, rel)
  step(rel, existsSync(t) ? readFileSync(t, 'utf8') : '', canonical)
}

// 2. Regenerate the ecosystem-bar PROPS block from the same registry (single
//    source — the bar's labels/hosts/urls never drift from ecosystem.json).
//    Funnel order: framework → playbook → registry → akos.
const BAR_ORDER = ['agentskit', 'playbook', 'registry', 'akos']
const byId = Object.fromEntries(ecosystem.properties.map((p) => [p.id, p]))
const propLines = BAR_ORDER.map((id) => {
  const p = byId[id]
  return `    { id: '${id}', label: '${p.barLabel}', host: '${p.domain}', url: '${p.url}' },`
}).join('\n')
const barRel = 'apps/docs-next/public/ecosystem-bar.js'
const barPath = join(root, barRel)
if (existsSync(barPath)) {
  const bar = readFileSync(barPath, 'utf8')
  const re = /(\/\/ ecobar:props-start[^\n]*\n)[\s\S]*?(\n\s*\/\/ ecobar:props-end)/
  if (re.test(bar)) {
    const next = bar.replace(re, `$1  var PROPS = [\n${propLines}\n  ]$2`)
    step(barRel, bar, next)
  } else {
    console.error(`ecosystem: ${barRel} missing ecobar:props markers — cannot sync bar.`)
    drift = true
  }
}

if (check && drift) process.exit(1)
