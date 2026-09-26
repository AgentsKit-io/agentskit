#!/usr/bin/env node
/**
 * sync-ecosystem — distribute the canonical ecosystem.json (the registry of the
 * AgentsKit web properties) into each app that consumes it. Copies, never
 * hand-edited; --check fails if a copy is stale (the drift gate).
 *
 * The same ecosystem.json is also copied verbatim into sibling repos, so every
 * property renders the shared shell (bar, tour, footer, aurora) and llms.txt
 * block from one source.
 *
 *   node scripts/sync-ecosystem.mjs
 *   node scripts/sync-ecosystem.mjs --check
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
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
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), next)
    console.log('wrote', rel)
  }
}

// 1. Distribute the canonical registry into each consuming app.
for (const rel of ['apps/docs-next/lib/ecosystem.json', 'apps/landing/lib/ecosystem.json']) {
  const t = join(root, rel)
  step(rel, existsSync(t) ? readFileSync(t, 'utf8') : '', canonical)
}

// 2. Regenerate the shell's generated blocks (bar PROPS, tour SHOWCASE_PRODUCTS, CATALOG) from the
//    same registry (single source — labels/hosts/urls never drift from ecosystem.json).
//    Product order is explicit in the manifest. Repository-only products may
//    opt out until they have a suitable shared-navigation surface.
const barProducts = ecosystem.products
  .filter((product) => product.navigation.showInBar)
  .sort((a, b) => a.navigation.order - b.navigation.order)
const propLines = barProducts.map((product) => {
  const host = new URL(product.surfaces.home).host
  // `repo` travels with the entry so the bar's "Star on GitHub" can follow the product a visitor is actually on.
  // A product without a public repository carries null and the bar falls back to the organisation.
  return `    { id: ${JSON.stringify(product.id)}, label: ${JSON.stringify(product.shortName)}, host: ${JSON.stringify(host)}, url: ${JSON.stringify(product.surfaces.home)}, repo: ${JSON.stringify(product.repo ?? null)} },`
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
// Every catalog product (including ones hidden from the bar, such as Playbook) so the shell can
// resolve names and Star targets for `data-current` values outside the six-product navigation.
const catalogJson = JSON.stringify(
  Object.fromEntries(ecosystem.products.map((product) => [product.id, {
    name: product.name,
    shortName: product.shortName,
    repo: product.repo ?? null,
    url: product.surfaces.home,
  }])),
  null,
  2,
).replace(/\n/g, '\n  ')

const shellRel = 'apps/docs-next/public/shell/v1.js'
const shellPath = join(root, shellRel)
let syncedShell = null
if (existsSync(shellPath)) {
  const shell = readFileSync(shellPath, 'utf8')
  const blocks = [
    [/(\/\/ ecobar:props-start[^\n]*\n)[\s\S]*?(\n\s*\/\/ ecobar:props-end)/, `$1  var PROPS = [\n${propLines}\n  ]$2`],
    [/(\/\/ ecobar:showcase-start[^\n]*\n)[\s\S]*?(\n\s*\/\/ ecobar:showcase-end)/, `$1  var SHOWCASE_PRODUCTS = ${showcaseJson}$2`],
    [/(\/\/ ecobar:catalog-start[^\n]*\n)[\s\S]*?(\n\s*\/\/ ecobar:catalog-end)/, `$1  var CATALOG = ${catalogJson}$2`],
  ]
  if (blocks.every(([pattern]) => pattern.test(shell))) {
    const next = blocks.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), shell)
    step(shellRel, shell, next)
    syncedShell = next
  } else {
    console.error(`ecosystem: ${shellRel} missing generated markers — cannot sync the shell.`)
    drift = true
  }
} else {
  console.error(`ecosystem: ${shellRel} is missing.`)
  drift = true
}

// 3. The legacy /ecosystem-bar.js URL serves the same shell, and Registry keeps a fallback copy
//    of the hosted assets for local development and outages of the canonical origin.
if (syncedShell !== null) {
  const shellCss = readFileSync(join(root, 'apps/docs-next/public/shell/v1.css'), 'utf8')
  const copies = [
    ['apps/docs-next/public/ecosystem-bar.js', syncedShell],
    ['apps/registry/public/ecosystem-bar.js', syncedShell],
    ['apps/registry/public/shell/v1.js', syncedShell],
    ['apps/registry/public/shell/v1.css', shellCss],
  ]
  for (const [rel, next] of copies) {
    const target = join(root, rel)
    step(rel, existsSync(target) ? readFileSync(target, 'utf8') : '', next)
  }
}

if (check && drift) process.exit(1)
