#!/usr/bin/env node
/**
 * Promotion-RFC gate.
 *
 * docs/STABILITY.md: "beta → stable requires an RFC ... The RFC documents the
 * public API surface being committed to." This asserts every package declared
 * `stable` has a matching RFC in `rfcs/` (filename or body names the package),
 * so a package can't silently flip to stable without committing its surface.
 *
 * `core` is exempt: it graduated via the six contract ADRs (0001-0006) +
 * docs/RELEASE-CORE-V1.md, predating the RFC-promotion process. Any *other*
 * package that goes stable must ship a promotion RFC.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')
const rfcsDir = join(root, 'rfcs')

// Packages allowed to be `stable` without a promotion RFC, with the reason.
const EXEMPT = new Map([['@agentskit/core', 'ADR-backed graduation (ADRs 0001-0006 + docs/RELEASE-CORE-V1.md)']])

// Load every RFC's filename + body once.
const rfcs = existsSync(rfcsDir)
  ? readdirSync(rfcsDir)
      .filter(f => /^\d{4}-.*\.md$/.test(f))
      .map(f => ({ file: f, text: readFileSync(join(rfcsDir, f), 'utf8') }))
  : []

const errors = []
for (const name of readdirSync(pkgsDir)) {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(join(pkgsDir, name, 'package.json'), 'utf8'))
  } catch {
    continue
  }
  if (pkg.agentskit?.stability !== 'stable') continue
  if (EXEMPT.has(pkg.name)) continue

  const hasRfc = rfcs.some(r => r.file.includes(name) || r.text.includes(pkg.name))
  if (!hasRfc) {
    errors.push(`${pkg.name}: declared "stable" but no promotion RFC in rfcs/ names it`)
  }
}

if (errors.length > 0) {
  console.error(
    '\nPromotion-RFC check failed:\n' +
      errors.map(e => `  - ${e}`).join('\n') +
      '\n\nbeta → stable requires an RFC committing the public API (docs/STABILITY.md).\n' +
      'Write rfcs/NNNN-<pkg>-stable.md, or revert the package to beta.\n',
  )
  process.exit(1)
}
console.log('every stable package has a promotion RFC (or documented exemption) ✓')
