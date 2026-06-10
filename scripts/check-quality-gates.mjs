#!/usr/bin/env node
/**
 * Quality-gate orchestrator. Runs every structural gate in sequence and
 * reports a single pass/fail summary. These are the fast, build-free checks
 * that protect the codebase's non-negotiables; `pnpm check:all` layers
 * typecheck + build + test on top.
 *
 * Run locally before opening a PR: `pnpm check:quality-gates`.
 */

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()

const GATES = [
  ['core zero-dependency contract', 'check-core-no-deps.mjs'],
  ['typed errors (no bare throw)', 'check-no-bare-throw.mjs'],
  ['no explicit any', 'check-no-any.mjs'],
  ['named exports only', 'check-named-exports.mjs'],
  ['file-size budgets', 'check-file-size.mjs'],
  ['src ↔ test parity', 'check-src-test-parity.mjs'],
  ['for-agents docs coverage', 'check-for-agents-coverage.mjs'],
  ['ADR/RFC index sync', 'check-doc-index.mjs'],
  ['docs locale parity', 'check-intl-parity.mjs'],
  ['ecosystem count drift', 'check-count-drift.mjs'],
  ['ecosystem registry sync', 'sync-ecosystem.mjs', ['--check']],
  ['brand token sync', 'sync-brand.mjs', ['--property', 'agentskit', '--out', 'apps/docs-next/app/brand-tokens.css', '--check']],
  ['brand token sync (landing)', 'sync-brand.mjs', ['--property', 'agentskit', '--format', 'landing', '--out', 'apps/landing/app/globals.css', '--check']],
]

const failed = []

for (const [label, script, args = []] of GATES) {
  process.stdout.write(`\n▶ ${label}\n`)
  const res = spawnSync(process.execPath, [join(root, 'scripts', script), ...args], {
    stdio: 'inherit',
    cwd: root,
  })
  if (res.status !== 0) failed.push(label)
}

console.log('\n' + '─'.repeat(56))
if (failed.length > 0) {
  console.error(`✗ ${failed.length} gate(s) failed: ${failed.join(', ')}`)
  process.exit(1)
}
console.log(`✓ all ${GATES.length} quality gates passed`)
