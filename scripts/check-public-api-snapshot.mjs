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

/**
 * @param {string[]} argv
 * @param {{ stdout?: (text: string) => void, stderr?: (text: string) => void }} [output]
 * @returns {{ update: boolean, json: boolean, exitCode?: number }}
 */
export function parseArgs(argv, { stdout = (text) => process.stdout.write(text), stderr = (text) => process.stderr.write(text) } = {}) {
  const logError = (text) => stderr(`${text}\n`)
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
      printHelp(stdout)
      return { update, json, exitCode: 0 }
    }
    logError(`public-api-snapshot: unknown flag ${JSON.stringify(arg)}`)
    logError('Usage: node scripts/check-public-api-snapshot.mjs [--update] [--json]')
    return { update, json, exitCode: 2 }
  }
  return { update, json }
}

function printHelp(stdout) {
  stdout(`Usage: node scripts/check-public-api-snapshot.mjs [--update]

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

/**
 * Run the snapshot gate without exiting the importing process.
 * @param {{ root?: string, argv?: string[], env?: NodeJS.ProcessEnv, stdout?: (text: string) => void, stderr?: (text: string) => void }} [options]
 * @returns {number}
 */
export function runPublicApiSnapshot({
  root = REPO_ROOT,
  argv = process.argv.slice(2),
  env = process.env,
  stdout = (text) => process.stdout.write(text),
  stderr = (text) => process.stderr.write(text),
} = {}) {
  const { update, json, exitCode } = parseArgs(argv, { stdout, stderr })
  if (exitCode !== undefined) return exitCode
  const log = (text) => stdout(`${text}\n`)
  const logError = (text) => stderr(`${text}\n`)
  const packagesRoot = path.join(root, 'packages')
  const baselinePath = path.join(root, DEFAULT_BASELINE_RELATIVE)

  const publicPackages = discoverPublicPackages(packagesRoot, {
    readdirSync,
    readFileSync,
    join: path.join,
  })

  const planPath = !update && env.PACKED_CONSUMERS_BUILD_PLAN
  const buildPlan = planPath ? JSON.parse(readFileSync(planPath, 'utf8')) : undefined
  const packages = selectPackedConsumerPackages(publicPackages, buildPlan)
  const skipped = publicPackages.filter((pkg) => !packages.includes(pkg))
  if (skipped.length > 0) {
    logError(`public-api-snapshot: skipped packages outside build plan: ${skipped.map((pkg) => pkg.packageName).join(', ')}`)
  }

  const missing = findMissingBuildOutputs(packages, {
    existsSync,
    resolve: path.resolve,
  })
  if (missing.length > 0) {
    logError('public-api-snapshot: missing build prerequisite (package dist outputs).')
    logError(`Run: ${BUILD_PREREQUISITE_COMMAND}`)
    logError('Missing:')
    for (const line of missing) logError(`  - ${line}`)
    return 1
  }

  const { snapshot, errors, stats } = buildPublicApiSnapshot(packages, {
    existsSync,
    resolve: path.resolve,
  })

  if (errors.length > 0) {
    logError('public-api-snapshot: failed to compute surface (refusing partial baseline).')
    for (const err of errors) logError(`  - ${err}`)
    return 1
  }

  const serialized = serializeSnapshot(snapshot)

  if (update) {
    writeFileAtomic(baselinePath, serialized)
    log(`public-api-snapshot: updated ${DEFAULT_BASELINE_RELATIVE}`)
    log(`  ${formatStats(stats)}`)
    // Per-package summary
    for (const packageName of Object.keys(snapshot.packages)) {
      const subs = snapshot.packages[packageName].subpaths
      const subpathCount = Object.keys(subs).length
      let symbols = 0
      for (const sub of Object.values(subs)) symbols += sub.symbols.length
      log(`  ${packageName}: ${subpathCount} subpath(s), ${symbols} symbol(s)`)
    }
    return 0
  }

  if (!existsSync(baselinePath)) {
    logError(`public-api-snapshot: baseline missing at ${DEFAULT_BASELINE_RELATIVE}`)
    logError('Create it with: node scripts/check-public-api-snapshot.mjs --update')
    return 1
  }

  let baseline
  try {
    baseline = parseSnapshot(readFileSync(baselinePath, 'utf8'))
  } catch (error) {
    logError(
      `public-api-snapshot: invalid baseline: ${error instanceof Error ? error.message : String(error)}`,
    )
    return 1
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
      stdout(`${JSON.stringify({ schemaVersion: 1, passed: false, ...stats, packageDetails, changes }, null, 2)}\n`)
      return 1
    }
    logError('public-api-snapshot: public API surface drifted from baseline.')
    logError('')
    for (const line of formatDiffDiagnostics(changes)) {
      logError(line)
    }
    logError('')
    logError('If intentional, refresh the baseline:')
    logError('  node scripts/check-public-api-snapshot.mjs --update')
    logError(`Current surface: ${formatStats(stats)}`)
    return 1
  }

  // Byte-stable re-serialize check against committed file
  const committed = readFileSync(baselinePath, 'utf8')
  if (committed !== (buildPlan === undefined ? serialized : serializeSnapshot(baseline))) {
    if (json) {
      stdout(`${JSON.stringify({ schemaVersion: 1, passed: false, ...stats, packageDetails, changes: [], baselineFormattingDrift: true }, null, 2)}\n`)
      return 1
    }
    logError(
      'public-api-snapshot: baseline JSON formatting or key order drifted (content keys match but bytes differ).',
    )
    logError('Refresh with: node scripts/check-public-api-snapshot.mjs --update')
    return 1
  }

  if (json) {
    stdout(`${JSON.stringify({ schemaVersion: 1, passed: true, ...stats, packageDetails, changes: [] }, null, 2)}\n`)
  } else {
    log(`public-api-snapshot: ok — ${formatStats(stats)}`)
  }
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runPublicApiSnapshot()
}
