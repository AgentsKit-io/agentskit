#!/usr/bin/env node
/**
 * Deterministic public API snapshot gate.
 *
 * Enumerates every public packages/* export subpath, reads built declaration
 * files via the repository TypeScript compiler API, and compares the
 * normalized surface to docs/stability/public-api-v1.json.
 *
 * Prerequisite: package dist outputs must already exist
 *   (`pnpm --filter "./packages/*" build`).
 *
 * Usage:
 *   node scripts/check-public-api-snapshot.mjs
 *   node scripts/check-public-api-snapshot.mjs --update
 *   node scripts/check-public-api-snapshot.mjs --json
 */

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { selectPackedConsumerPackages } from './lib/packed-consumers.mjs'
import {
  BUILD_PREREQUISITE_COMMAND,
  DEFAULT_BASELINE_RELATIVE,
  buildPublicApiSnapshot,
  diffSnapshots,
  discoverPublicPackages,
  findMissingBuildOutputs,
  formatDiffDiagnostics,
  formatStats,
  parseSnapshot,
  serializeSnapshot,
} from './lib/public-api-snapshot.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages')
const BASELINE_PATH = path.join(REPO_ROOT, DEFAULT_BASELINE_RELATIVE)

/**
 * @param {string[]} argv
 * @returns {{ update: boolean, json: boolean }}
 */
export function parseArgs(argv) {
  let update = false
  let json = false
  for (const arg of argv) {
    if (arg === '--update') {
      update = true
      continue
    }
    if (arg === '--json') {
      json = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    console.error(`public-api-snapshot: unknown flag ${JSON.stringify(arg)}`)
    console.error('Usage: node scripts/check-public-api-snapshot.mjs [--update] [--json]')
    process.exit(2)
  }
  return { update, json }
}

function printHelp() {
  console.log(`Usage: node scripts/check-public-api-snapshot.mjs [--update]

Compare the public TypeScript API surface of every non-private packages/*
export subpath against ${DEFAULT_BASELINE_RELATIVE}.

  --update   Rewrite the baseline atomically from the current surface.
  --json     Print machine-readable summary data.

Prerequisite:
  ${BUILD_PREREQUISITE_COMMAND}
`)
}

/**
 * Atomic write: temp file in the same directory, then rename.
 * @param {string} filePath
 * @param {string} contents
 */
function writeFileAtomic(filePath, contents) {
  const dir = path.dirname(filePath)
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  )
  writeFileSync(tmp, contents, 'utf8')
  renameSync(tmp, filePath)
}

function main() {
  const { update, json } = parseArgs(process.argv.slice(2))

  const publicPackages = discoverPublicPackages(PACKAGES_ROOT, {
    readdirSync,
    readFileSync,
    join: path.join,
  })

  const planPath = !update && process.env.PACKED_CONSUMERS_BUILD_PLAN
  const buildPlan = planPath ? JSON.parse(readFileSync(planPath, 'utf8')) : undefined
  const packages = selectPackedConsumerPackages(publicPackages, buildPlan)
  const skipped = publicPackages.filter((pkg) => !packages.includes(pkg))
  if (skipped.length > 0) {
    console.error(`public-api-snapshot: skipped packages outside build plan: ${skipped.map((pkg) => pkg.packageName).join(', ')}`)
  }

  const missing = findMissingBuildOutputs(packages, {
    existsSync,
    resolve: path.resolve,
  })
  if (missing.length > 0) {
    console.error('public-api-snapshot: missing build prerequisite (package dist outputs).')
    console.error(`Run: ${BUILD_PREREQUISITE_COMMAND}`)
    console.error('Missing:')
    for (const line of missing) console.error(`  - ${line}`)
    process.exit(1)
  }

  const { snapshot, errors, stats } = buildPublicApiSnapshot(packages, {
    existsSync,
    resolve: path.resolve,
  })

  if (errors.length > 0) {
    console.error('public-api-snapshot: failed to compute surface (refusing partial baseline).')
    for (const err of errors) console.error(`  - ${err}`)
    process.exit(1)
  }

  const serialized = serializeSnapshot(snapshot)

  if (update) {
    writeFileAtomic(BASELINE_PATH, serialized)
    console.log(`public-api-snapshot: updated ${DEFAULT_BASELINE_RELATIVE}`)
    console.log(`  ${formatStats(stats)}`)
    // Per-package summary
    for (const packageName of Object.keys(snapshot.packages)) {
      const subs = snapshot.packages[packageName].subpaths
      const subpathCount = Object.keys(subs).length
      let symbols = 0
      for (const sub of Object.values(subs)) symbols += sub.symbols.length
      console.log(`  ${packageName}: ${subpathCount} subpath(s), ${symbols} symbol(s)`)
    }
    process.exit(0)
  }

  if (!existsSync(BASELINE_PATH)) {
    console.error(`public-api-snapshot: baseline missing at ${DEFAULT_BASELINE_RELATIVE}`)
    console.error('Create it with: node scripts/check-public-api-snapshot.mjs --update')
    process.exit(1)
  }

  let baseline
  try {
    baseline = parseSnapshot(readFileSync(BASELINE_PATH, 'utf8'))
  } catch (error) {
    console.error(
      `public-api-snapshot: invalid baseline: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  }

  const comparisonBaseline = buildPlan === undefined ? baseline : {
    ...baseline,
    packages: Object.fromEntries(Object.entries(baseline.packages).filter(([name]) =>
      packages.some((pkg) => pkg.packageName === name))),
  }
  const changes = diffSnapshots(comparisonBaseline, snapshot)
  const packageDetails = Object.fromEntries(Object.entries(snapshot.packages).map(([name, pkg]) => {
    const subpaths = Object.values(pkg.subpaths)
    return [name, {
      subpaths: subpaths.length,
      symbols: subpaths.reduce((sum, subpath) => sum + subpath.symbols.length, 0),
    }]
  }))
  if (changes.length > 0) {
    if (json) {
      process.stdout.write(`${JSON.stringify({ schemaVersion: 1, passed: false, ...stats, packageDetails, changes }, null, 2)}\n`)
      process.exit(1)
    }
    console.error('public-api-snapshot: public API surface drifted from baseline.')
    console.error('')
    for (const line of formatDiffDiagnostics(changes)) {
      console.error(line)
    }
    console.error('')
    console.error('If intentional, refresh the baseline:')
    console.error('  node scripts/check-public-api-snapshot.mjs --update')
    console.error(`Current surface: ${formatStats(stats)}`)
    process.exit(1)
  }

  // Byte-stable re-serialize check against committed file
  const committed = readFileSync(BASELINE_PATH, 'utf8')
  if (committed !== (buildPlan === undefined ? serialized : serializeSnapshot(baseline))) {
    if (json) {
      process.stdout.write(`${JSON.stringify({ schemaVersion: 1, passed: false, ...stats, packageDetails, changes: [], baselineFormattingDrift: true }, null, 2)}\n`)
      process.exit(1)
    }
    console.error(
      'public-api-snapshot: baseline JSON formatting or key order drifted (content keys match but bytes differ).',
    )
    console.error('Refresh with: node scripts/check-public-api-snapshot.mjs --update')
    process.exit(1)
  }

  if (json) {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, passed: true, ...stats, packageDetails, changes: [] }, null, 2)}\n`)
  } else {
    console.log(`public-api-snapshot: ok — ${formatStats(stats)}`)
  }
}

main()
