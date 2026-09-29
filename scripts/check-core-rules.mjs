#!/usr/bin/env node
/**
 * CI gate: @agentskit/core/rules applied to published package source.
 *
 * Reuses the cross-platform scanner and ratchet (scanRepository,
 * compareToBaseline, tightenBaseline). Scope is packages/<name>/src only.
 * Counts may only go down (`--update` refuses to raise them).
 *
 *   node scripts/check-core-rules.mjs
 *   node scripts/check-core-rules.mjs --update
 *
 * Requires builds of @agentskit/core and @agentskit/cross-platform.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compareToBaseline, scanRepository, tightenBaseline, writeFileAtomic } from '../packages/cross-platform/dist/index.js'
import { CORE_RULES } from '../packages/core/dist/rules.js'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_BASELINE = '.core-rules-baseline.json'
const PACKAGE_SRC = /^packages\/[^/]+\/src\//

export function emptyBaseline() {
  return {
    version: 1,
    include: ['packages'],
    exclude: [],
    scope: 'packages/*/src',
    entries: {},
  }
}

export function judge(findings, baseline) {
  return compareToBaseline(findings, baseline)
}

export function planUpdate(findings, baseline) {
  return tightenBaseline(findings, baseline, false)
}

export async function scanCoreFindings(root) {
  const findings = await scanRepository({
    root,
    include: ['packages'],
    rules: CORE_RULES,
  })
  return findings.filter(finding => PACKAGE_SRC.test(finding.file))
}

function summarize(findings) {
  const counts = new Map(CORE_RULES.map(rule => [rule.id, 0]))
  for (const finding of findings) counts.set(finding.rule, (counts.get(finding.rule) ?? 0) + 1)
  return [...counts.entries()].map(([id, count]) => `${id}=${count}`).join(', ')
}

function canonicalBaseline(baseline) {
  const entries = Object.create(null)
  for (const file of Object.keys(baseline.entries).sort()) {
    const rules = Object.create(null)
    for (const rule of Object.keys(baseline.entries[file]).sort()) rules[rule] = baseline.entries[file][rule]
    entries[file] = rules
  }
  return { ...baseline, entries }
}

function readBaseline(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function format(finding) {
  return `${finding.file}:${finding.line} [${finding.rule}] ${finding.message}\n    → use ${finding.fix}`
}

export async function run(argv, root, io) {
  const update = argv.includes('--update')
  const init = argv.includes('--init')
  const json = argv.includes('--json')
  const baselineFlag = argv.indexOf('--baseline')
  const baselinePath = resolve(root, baselineFlag >= 0 ? argv[baselineFlag + 1] : DEFAULT_BASELINE)

  let existing
  try {
    existing = readBaseline(baselinePath)
  } catch {
    existing = undefined
  }

  if (init) {
    if (existing) {
      io.error(`Baseline already exists at ${baselinePath}. Refusing to recreate it.`)
      return 1
    }
    const findings = await scanCoreFindings(root)
    const { baseline } = tightenBaseline(findings, emptyBaseline(), true)
    await writeFileAtomic(baselinePath, `${JSON.stringify(canonicalBaseline(baseline), null, 2)}\n`)
    io.log(`Baseline written to ${baselinePath} with ${findings.length} existing finding(s) (${summarize(findings)}).`)
    return 0
  }

  if (!existing) {
    io.error(`No baseline at ${baselinePath}. Create it with: node scripts/check-core-rules.mjs --init`)
    return 1
  }

  const findings = await scanCoreFindings(root)
  if (update) {
    const { baseline, increased } = planUpdate(findings, existing)
    if (increased.length > 0) {
      io.error(`Refusing to raise baseline counts:\n  ${increased.join('\n  ')}`)
      return 1
    }
    await writeFileAtomic(baselinePath, `${JSON.stringify(canonicalBaseline(baseline), null, 2)}\n`)
    io.log(`Baseline updated: ${findings.length} finding(s) remain (${summarize(findings)}).`)
    return 0
  }

  const { regressions, improvements } = judge(findings, existing)
  if (json) io.log(JSON.stringify({ regressions, improvements }, null, 2))
  else {
    for (const finding of regressions) io.error(format(finding))
    if (improvements.length > 0) {
      io.log(`${improvements.length} baseline entr${improvements.length === 1 ? 'y' : 'ies'} can be tightened: run with --update.`)
    }
  }
  if (regressions.length > 0) {
    io.error(`\n✗ ${regressions.length} new core rule issue(s) (${summarize(findings)}).`)
    return 1
  }
  io.log(`✓ no new core rule issues (${findings.length} baselined: ${summarize(findings)})`)
  return 0
}

function invokedDirectly() {
  const entry = process.argv[1]
  if (!entry) return false
  return import.meta.url === pathToFileURL(resolve(entry)).href
}

if (invokedDirectly()) {
  process.exitCode = await run(process.argv.slice(2), repoRoot, {
    log: line => process.stdout.write(`${line}\n`),
    error: line => process.stderr.write(`${line}\n`),
  })
}
