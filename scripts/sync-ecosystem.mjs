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
import { parseEcosystemManifest } from './lib/ecosystem-contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const canonical = readFileSync(join(root, 'ecosystem.json'), 'utf8')
const ecosystem = parseEcosystemManifest(JSON.parse(canonical))
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
//    Product order is explicit in the manifest. Repository-only products may
//    opt out until they have a suitable shared-navigation surface.
const barProducts = ecosystem.products
  .filter((product) => product.navigation.showInBar)
  .sort((a, b) => a.navigation.order - b.navigation.order)
const propLines = barProducts.map((product) => {
  const host = new URL(product.surfaces.home).host
  return `    { id: ${JSON.stringify(product.id)}, label: ${JSON.stringify(product.shortName)}, host: ${JSON.stringify(host)}, url: ${JSON.stringify(product.surfaces.home)} },`
}).join('\n')
const showcaseProducts = barProducts.map((product) => ({
  id: product.id,
  name: product.name,
  shortName: product.shortName,
  accent: product.accent,
  href: product.surfaces.docs || product.surfaces.home,
  ...product.showcase,
}))
const showcaseJson = JSON.stringify(showcaseProducts, null, 2).replace(/\n/g, '\n  ')
const barRel = 'apps/docs-next/public/ecosystem-bar.js'
const barPath = join(root, barRel)
if (existsSync(barPath)) {
  const bar = readFileSync(barPath, 'utf8')
  const propsPattern = /(\/\/ ecobar:props-start[^\n]*\n)[\s\S]*?(\n\s*\/\/ ecobar:props-end)/
  const showcasePattern = /(\/\/ ecobar:showcase-start[^\n]*\n)[\s\S]*?(\n\s*\/\/ ecobar:showcase-end)/
  if (propsPattern.test(bar) && showcasePattern.test(bar)) {
    const next = bar
      .replace(propsPattern, `$1  var PROPS = [\n${propLines}\n  ]$2`)
      .replace(showcasePattern, `$1  var SHOWCASE_PRODUCTS = ${showcaseJson}$2`)
    step(barRel, bar, next)
  } else {
    console.error(`ecosystem: ${barRel} missing generated markers — cannot sync bar.`)
    drift = true
  }
}

if (check && drift) process.exit(1)
