#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_BASELINE_RELATIVE,
  buildPublicApiSnapshot,
  diffSnapshots,
  discoverPublicPackages,
  findMissingBuildOutputs,
  formatDiffDiagnostics,
  parseSnapshot,
} from './lib/public-api-snapshot.mjs'
import {
  calculateCoverage,
  findBaselineGrowth,
  JSDOC_BASELINE_RELATIVE,
  serializeJsdocBaseline,
} from './lib/jsdoc-coverage.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_ROOT = path.join(ROOT, 'packages')
const API_BASELINE_PATH = path.join(ROOT, DEFAULT_BASELINE_RELATIVE)
const BASELINE_PATH = path.join(ROOT, JSDOC_BASELINE_RELATIVE)

function parseArgs(argv) {
  const args = new Set(argv)
  for (const arg of args) {
    if (arg !== '--update' && arg !== '--json' && arg !== '--help' && arg !== '-h') {
      console.error(`check-jsdoc-coverage: unknown flag ${JSON.stringify(arg)}`)
      process.exit(2)
    }
  }
  if (args.has('--help') || args.has('-h')) {
    console.log('Usage: node scripts/check-jsdoc-coverage.mjs [--update] [--json]')
    process.exit(0)
  }
  return { update: args.has('--update'), json: args.has('--json') }
}

function writeAtomic(filePath, contents) {
  const tmp = `${filePath}.${process.pid}.tmp`
  writeFileSync(tmp, contents, 'utf8')
  renameSync(tmp, filePath)
}

function readCoverageBaseline() {
  if (!existsSync(BASELINE_PATH)) return null
  const parsed = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  if (parsed?.schemaVersion !== 1 || !parsed.packages || typeof parsed.packages !== 'object') {
    throw new Error(`invalid baseline at ${JSDOC_BASELINE_RELATIVE}`)
  }
  for (const [name, symbols] of Object.entries(parsed.packages)) {
    if (!Array.isArray(symbols) || symbols.some((value) => typeof value !== 'string')) {
      throw new Error(`invalid undocumented symbols for ${name} in ${JSDOC_BASELINE_RELATIVE}`)
    }
  }
  return parsed.packages
}

function formatPercent(documented, total) {
  return total === 0 ? 'n/a' : `${((documented / total) * 100).toFixed(1)}%`
}

function printTable(coverage) {
  const rows = Object.entries(coverage)
  const nameWidth = Math.max('Package'.length, ...rows.map(([name]) => name.length))
  console.log(`\n${'Package'.padEnd(nameWidth)}  Documented  Total  Coverage`)
  console.log(`${'-'.repeat(nameWidth)}  ----------  -----  --------`)
  for (const [name, stats] of rows) {
    console.log(`${name.padEnd(nameWidth)}  ${String(stats.documented).padStart(10)}  ${String(stats.total).padStart(5)}  ${formatPercent(stats.documented, stats.total)}`)
  }
  const documented = rows.reduce((sum, [, stats]) => sum + stats.documented, 0)
  const total = rows.reduce((sum, [, stats]) => sum + stats.total, 0)
  console.log(`${'TOTAL'.padEnd(nameWidth)}  ${String(documented).padStart(10)}  ${String(total).padStart(5)}  ${formatPercent(documented, total)}`)
}

function main() {
  const { update, json } = parseArgs(process.argv.slice(2))
  const packages = discoverPublicPackages(PACKAGES_ROOT, {
    readdirSync,
    readFileSync,
    join: path.join,
  })
  const missing = findMissingBuildOutputs(packages, { existsSync, resolve: path.resolve })
  if (missing.length > 0) {
    console.error('check-jsdoc-coverage: package declarations are missing; build packages first.')
    for (const line of missing) console.error(`  - ${line}`)
    process.exit(1)
  }

  const result = buildPublicApiSnapshot(packages, { existsSync, resolve: path.resolve })
  if (result.errors.length > 0) {
    console.error('check-jsdoc-coverage: failed to read public declarations.')
    for (const line of result.errors) console.error(`  - ${line}`)
    process.exit(1)
  }

  let apiBaseline
  try {
    apiBaseline = parseSnapshot(readFileSync(API_BASELINE_PATH, 'utf8'))
  } catch (error) {
    console.error(`check-jsdoc-coverage: cannot read ${DEFAULT_BASELINE_RELATIVE}: ${error.message}`)
    process.exit(1)
  }
  const apiDrift = diffSnapshots(apiBaseline, result.snapshot)
  if (apiDrift.length > 0) {
    console.error('check-jsdoc-coverage: current declarations differ from the public API source of truth.')
    for (const line of formatDiffDiagnostics(apiDrift)) console.error(`  ${line}`)
    process.exit(1)
  }

  const coverage = calculateCoverage(apiBaseline, result.documentation)
  if (!json) printTable(coverage)
  const rows = Object.entries(coverage)
  const documented = rows.reduce((sum, [, stats]) => sum + stats.documented, 0)
  const total = rows.reduce((sum, [, stats]) => sum + stats.total, 0)
  const currentBaseline = Object.fromEntries(
    rows.map(([name, stats]) => [name, stats.undocumented]),
  )

  let baseline
  try {
    baseline = readCoverageBaseline()
  } catch (error) {
    console.error(`check-jsdoc-coverage: ${error.message}`)
    process.exit(1)
  }

  if (!baseline) {
    if (!update) {
      console.error(`check-jsdoc-coverage: baseline missing at ${JSDOC_BASELINE_RELATIVE}`)
      console.error('Create it with: node scripts/check-jsdoc-coverage.mjs --update')
      process.exit(1)
    }
    writeAtomic(BASELINE_PATH, serializeJsdocBaseline(currentBaseline))
    console.log(`check-jsdoc-coverage: initialized ${JSDOC_BASELINE_RELATIVE}`)
    return
  }

  const growth = findBaselineGrowth(coverage, baseline)
  if (growth.length > 0) {
    if (json) {
      process.stdout.write(`${JSON.stringify({ schemaVersion: 1, passed: false, documented, total,
        coveragePercent: total === 0 ? null : Number(((documented / total) * 100).toFixed(1)),
        undocumented: total - documented, packages: coverage, baselineGrowth: growth }, null, 2)}\n`)
    } else {
      console.error('check-jsdoc-coverage: newly undocumented public symbols exceed the shrink-only baseline.')
      for (const line of growth) console.error(`  - ${line}`)
    }
    process.exitCode = 1
    return
  }

  if (update) {
    writeAtomic(BASELINE_PATH, serializeJsdocBaseline(currentBaseline))
    console.log(`check-jsdoc-coverage: updated ${JSDOC_BASELINE_RELATIVE} (baseline can only shrink)`)
    return
  }

  if (json) {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, passed: true, documented, total,
      coveragePercent: total === 0 ? null : Number(((documented / total) * 100).toFixed(1)),
      undocumented: total - documented, packages: coverage, baselineGrowth: [] }, null, 2)}\n`)
  } else {
    console.log(`check-jsdoc-coverage: ok — baseline ${JSDOC_BASELINE_RELATIVE}`)
  }
}

main()
