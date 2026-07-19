#!/usr/bin/env node
/**
 * Graduation-evidence gate (ADR 0024).
 *
 * Every non-exempt package declared `stable` must ship a valid evidence
 * manifest at docs/stability/<package-directory>.json per
 * docs/stability/README.md (schemaVersion 1): soak window, qualifying
 * minor lines, and seven repository-relative evidence axis paths that exist
 * as files under the repo root.
 *
 * `@agentskit/core` is the sole documented exemption.
 * Beta/alpha packages are ignored — missing evidence is scorecard work, not
 * a gate failure, until the package is declared stable.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EVIDENCE_EXEMPT,
  auditStabilityEvidence,
} from './lib/stability-gates.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')
const evidenceDir = join(root, 'docs', 'stability')

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

function loadEvidence(pkg) {
  const filePath = join(evidenceDir, `${pkg.dir}.json`)
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return { kind: 'missing' }
  }
  try {
    return { kind: 'ok', doc: JSON.parse(readFileSync(filePath, 'utf8')) }
  } catch (err) {
    return {
      kind: 'invalid-json',
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

function pathExists(relPath) {
  const abs = join(root, relPath)
  try {
    return existsSync(abs) && statSync(abs).isFile()
  } catch {
    return false
  }
}

const today = new Date().toISOString().slice(0, 10)
const errors = auditStabilityEvidence({
  packages,
  loadEvidence,
  pathExists,
  today,
  exempt: EVIDENCE_EXEMPT,
})

if (errors.length > 0) {
  console.error(
    '\nStability-evidence check failed:\n' +
      errors.map((e) => `  - ${e}`).join('\n') +
      '\n\nbeta → stable requires machine-readable graduation evidence (ADR 0024, docs/stability/README.md).\n' +
      'Write docs/stability/<package-directory>.json with schemaVersion 1, a ≥90-day soak, ' +
      '≥2 distinct minor-line releases in-window, and seven existing evidence axis files.\n' +
      `@agentskit/core is the sole documented exemption.\n`,
  )
  process.exit(1)
}

const stableCount = packages.filter((p) => p.stability === 'stable').length
console.log(
  `stability evidence valid for every non-exempt stable package ` +
    `(${stableCount} stable package(s) audited; core exempt) ✓`,
)
