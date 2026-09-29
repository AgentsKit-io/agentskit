#!/usr/bin/env node
/**
 * CI gate: no new hand-rolled HTTP patterns (ADR-0037).
 *
 * Reuses scanRepository, compareToBaseline and tightenBaseline from
 * @agentskit/cross-platform with NET_RULES from @agentskit/net/rules.
 * Existing findings are recorded in `.net-rules-baseline.json`; a check
 * fails when any count grows. packages/net is excluded because it owns the
 * implementation and its tests contain intentional matches.
 *
 *   node scripts/check-net-rules.mjs
 *   node scripts/check-net-rules.mjs --init
 *   node scripts/check-net-rules.mjs --update
 *
 * Requires builds of @agentskit/cross-platform and @agentskit/net.
 */

import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { compareToBaseline, scanRepository, tightenBaseline } from '../packages/cross-platform/dist/index.js'
import { NET_RULES } from '../packages/net/dist/rules.js'

const require = createRequire(import.meta.url)
const BASELINE_NAME = '.net-rules-baseline.json'
const INCLUDE = ['packages', 'scripts', 'apps', 'tests', 'e2e']
const EXCLUDE = ['packages/net/']

function fail(message) {
  process.stderr.write(`${message}\n`)
  return 1
}

function verifyBundles() {
  const esmIds = NET_RULES.map(rule => rule.id)
  const cjs = require('../packages/net/dist/rules.cjs')
  const cjsIds = Array.isArray(cjs.NET_RULES) ? cjs.NET_RULES.map(rule => rule.id) : []
  if (esmIds.length !== 6) return fail(`ESM rules bundle exported ${esmIds.length} rules`)
  if (cjsIds.join() !== esmIds.join()) return fail(`CJS rules bundle ids differ: ${cjsIds.join(', ')}`)
  if (cjs.default !== undefined) return fail('CJS rules bundle has a default export')
  return 0
}

function format(finding) {
  return `${finding.file}:${finding.line} [${finding.rule}] ${finding.message}\n    → use ${finding.fix}`
}

async function readBaseline(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return undefined
  }
}

const bundleStatus = verifyBundles()
if (bundleStatus !== 0) process.exit(bundleStatus)

const root = process.cwd()
const baselinePath = resolve(root, BASELINE_NAME)
const init = process.argv.includes('--init')
const update = process.argv.includes('--update')
const allowIncrease = process.argv.includes('--allow-increase')

if (init) {
  const findings = await scanRepository({ root, include: INCLUDE, exclude: EXCLUDE, rules: NET_RULES })
  const empty = { version: 1, include: INCLUDE, exclude: EXCLUDE, entries: {} }
  const { baseline } = tightenBaseline(findings, empty, true)
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
  process.stdout.write(`Baseline written to ${BASELINE_NAME} with ${findings.length} existing finding(s).\n`)
} else {
  const existing = await readBaseline(baselinePath)
  if (!existing) {
    process.exit(fail(`No baseline at ${BASELINE_NAME}. Create it with: node scripts/check-net-rules.mjs --init`))
  }
  const findings = await scanRepository({
    root,
    include: existing.include,
    exclude: existing.exclude,
    rules: NET_RULES,
  })
  if (update) {
    const { baseline, increased } = tightenBaseline(findings, existing, allowIncrease)
    if (increased.length > 0 && !allowIncrease) {
      process.exit(fail(`Refusing to raise baseline counts:\n  ${increased.join('\n  ')}`))
    }
    await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
    process.stdout.write(`Baseline updated: ${findings.length} finding(s) remain.\n`)
  } else {
    const { regressions, improvements } = compareToBaseline(findings, existing)
    for (const finding of regressions) process.stderr.write(`${format(finding)}\n`)
    if (improvements.length > 0) {
      process.stdout.write(`${improvements.length} baseline entr${improvements.length === 1 ? 'y' : 'ies'} can be tightened with --update.\n`)
    }
    if (regressions.length > 0) {
      process.exit(fail(`\n✗ ${regressions.length} new net guardrail issue(s).`))
    }
    process.stdout.write(`✓ no new net guardrail issues (${findings.length} baselined)\n`)
  }
}
