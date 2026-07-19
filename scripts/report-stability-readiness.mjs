#!/usr/bin/env node
/**
 * Generated stability-readiness scorecard (ADR 0024).
 *
 * Evaluates every workspace package as a *candidate* for stable without
 * changing tiers, manifests, or evidence files. Missing graduation work is
 * reported as pending/no — never a process error.
 *
 * Columns: Package | Tier | Conventions | Stable deps | Promotion RFC |
 * Evidence | Soak | Axes | Ready
 */

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildStabilityReadinessScorecard,
  formatStabilityReadinessMarkdown,
} from './lib/stability-gates.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')
const rfcsDir = join(root, 'rfcs')
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
    dependencies: pkg.dependencies,
    optionalDependencies: pkg.optionalDependencies,
    peerDependencies: pkg.peerDependencies,
    devDependencies: pkg.devDependencies,
  })
}

let rfcs = []
try {
  rfcs = readdirSync(rfcsDir)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .map((f) => ({ file: f, text: readFileSync(join(rfcsDir, f), 'utf8') }))
} catch {}

function loadEvidence(pkg) {
  const filePath = join(evidenceDir, `${pkg.dir}.json`)
  try {
    return { kind: 'ok', doc: JSON.parse(readFileSync(filePath, 'utf8')) }
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err.code === 'ENOENT' || err.code === 'EISDIR')) {
      return { kind: 'missing' }
    }
    return {
      kind: 'invalid-json',
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

function pathExists(relPath) {
  const abs = join(root, relPath)
  try {
    readFileSync(abs)
    return true
  } catch {
    return false
  }
}

function hasConventions(pkg) {
  const p = join(pkgsDir, pkg.dir, 'CONVENTIONS.md')
  try {
    readFileSync(p)
    return true
  } catch {
    return false
  }
}

const todayArgIndex = process.argv.indexOf('--date')
const today =
  todayArgIndex !== -1 && process.argv[todayArgIndex + 1]
    ? process.argv[todayArgIndex + 1]
    : new Date().toISOString().slice(0, 10)

const rows = buildStabilityReadinessScorecard({
  packages,
  rfcs,
  loadEvidence,
  pathExists,
  hasConventions,
  today,
})

process.stdout.write(formatStabilityReadinessMarkdown(rows))

const ready = rows.filter((r) => r.ready === 'yes').length
process.stderr.write(
  `stability readiness: ${ready}/${rows.length} package(s) ready (audit date ${today})\n`,
)
