#!/usr/bin/env node
/**
 * check-count-drift — fails when marketing/docs copy hard-codes an ecosystem
 * count that disagrees with the canonical manifest (scripts/compute-stats.mjs).
 *
 * The fix for a violation is to read the value from the stats module instead of
 * typing a literal (e.g. `{counts.packages}` not `23`). Positioning phrases
 * ("8 libraries", "six contracts", "10 KB core") are NOT counts and are ignored.
 *
 * Baseline-ratchet (same pattern as check-for-agents-coverage): known-stale
 * literals live in .count-drift-baseline.json; only NEW drift fails the build.
 * Run with --update-baseline after an intentional cleanup to re-pin.
 *
 *   node scripts/check-count-drift.mjs
 *   node scripts/check-count-drift.mjs --update-baseline
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { computeStats, REPO_ROOT } from './compute-stats.mjs'

const counts = computeStats().counts
const baselinePath = join(REPO_ROOT, '.count-drift-baseline.json')
const update = process.argv.includes('--update-baseline')

// noun (regex fragment) → canonical count key. Only unambiguous nouns gated.
// Capture group 1 = digits, group 2 = optional "+". A trailing "+" means "at
// least" — it passes as long as the manifest value is >= the stated floor (so
// "100+ models" stays valid as the catalog grows). A bare number must match exactly.
const RULES = [
  { re: /(\d+)(\+)?\s+(?:native\s+)?adapters\b/gi, key: 'nativeAdapters' },
  { re: /(\d+)(\+)?\s+packages\b/gi, key: 'packages' },
  { re: /(\d+)(\+)?\s+integrations\b/gi, key: 'integrations' },
  { re: /(\d+)(\+)?\s+(?:ready-made\s+)?skills\b/gi, key: 'skills' },
  { re: /(\d+)(\+)?\s+recipes\b/gi, key: 'recipes' },
  { re: /(\d+)(\+)?\s+memory\s+backends\b/gi, key: 'memoryBackends' },
  { re: /(\d+)(\+)?\s+framework\s+bindings\b/gi, key: 'frameworkBindings' },
]

const SCAN_DIRS = ['apps/docs-next/app', 'apps/docs-next/content', 'apps/landing/app']
const EXT = /\.(tsx?|mdx)$/

function walk(dir, acc) {
  const abs = join(REPO_ROOT, dir)
  if (!existsSync(abs)) return acc
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.next') continue
    const rel = join(dir, name)
    const st = statSync(join(REPO_ROOT, rel))
    if (st.isDirectory()) walk(rel, acc)
    else if (EXT.test(name)) acc.push(rel)
  }
  return acc
}

const files = SCAN_DIRS.flatMap((d) => walk(d, []))
const violations = []

for (const file of files) {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (line.includes('count-drift-ignore')) return
    for (const { re, key } of RULES) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(line))) {
        const found = Number(m[1])
        const atLeast = Boolean(m[2]) // trailing "+"
        const ok = atLeast ? found <= counts[key] : found === counts[key]
        if (!ok) {
          violations.push(`${file}:${i + 1}: "${m[0].trim()}" — manifest ${key}=${counts[key]}`)
        }
      }
    }
  })
}

if (update) {
  writeFileSync(baselinePath, JSON.stringify({ violations: violations.sort() }, null, 2) + '\n')
  console.log(`count-drift baseline updated: ${violations.length} known-stale literals pinned.`)
  process.exit(0)
}

const baseline = existsSync(baselinePath)
  ? new Set(JSON.parse(readFileSync(baselinePath, 'utf8')).violations)
  : new Set()

const fresh = violations.filter((v) => !baseline.has(v))
const fixed = [...baseline].filter((v) => !violations.includes(v))

if (fixed.length) {
  console.log(`✓ ${fixed.length} baselined count(s) now fixed — run --update-baseline to shrink the baseline.`)
}

if (fresh.length) {
  console.error(`\n✗ count drift: ${fresh.length} hard-coded count(s) disagree with the manifest:\n`)
  for (const v of fresh) console.error('  ' + v)
  console.error('\nRead the value from @/lib/ecosystem-stats (e.g. {counts.packages}) instead of a literal.')
  process.exit(1)
}

console.log(`✓ no new count drift (${violations.length} baselined, ${files.length} files scanned).`)
