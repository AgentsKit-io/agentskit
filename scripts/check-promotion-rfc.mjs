#!/usr/bin/env node
/**
 * Promotion-RFC gate.
 *
 * docs/STABILITY.md: "beta → stable requires an RFC ... The RFC documents the
 * public API surface being committed to." Every non-exempt package declared
 * `stable` must ship a *dedicated* Accepted promotion RFC:
 *
 *   rfcs/NNNN-<package-directory>-stable.md
 *
 * with exact package + status metadata lines. A general RFC that merely
 * mentions the package, or a dedicated RFC still at Proposed, fails.
 *
 * `@agentskit/core` is the sole documented exemption (ADR-backed graduation).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PROMOTION_RFC_EXEMPT,
  auditPromotionRfcs,
} from './lib/stability-gates.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')
const rfcsDir = join(root, 'rfcs')

const packages = []
for (const dir of readdirSync(pkgsDir)) {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(join(pkgsDir, dir, 'package.json'), 'utf8'))
  } catch {
    continue
  }
  packages.push({
    name: pkg.name,
    dir,
    stability: pkg.agentskit?.stability,
  })
}

const rfcs = existsSync(rfcsDir)
  ? readdirSync(rfcsDir)
      .filter((f) => /^\d{4}-.*\.md$/.test(f))
      .map((f) => ({ file: f, text: readFileSync(join(rfcsDir, f), 'utf8') }))
  : []

const errors = auditPromotionRfcs({
  packages,
  rfcs,
  exempt: PROMOTION_RFC_EXEMPT,
})

if (errors.length > 0) {
  console.error(
    '\nPromotion-RFC check failed:\n' +
      errors.map((e) => `  - ${e}`).join('\n') +
      '\n\nbeta → stable requires a dedicated Accepted promotion RFC (docs/STABILITY.md).\n' +
      'Write rfcs/NNNN-<package-directory>-stable.md containing:\n' +
      '  - **Package**: `@agentskit/<name>`\n' +
      '  - **Status**: Accepted\n' +
      'A general RFC that merely mentions the package is not enough; Proposed is not enough.\n' +
      `@agentskit/core is the sole documented exemption.\n`,
  )
  process.exit(1)
}
console.log('every stable package has a dedicated Accepted promotion RFC (or documented exemption) ✓')
