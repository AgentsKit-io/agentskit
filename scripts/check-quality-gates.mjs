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
  ['stability-tier integrity', 'check-stability-tier.mjs'],
  ['README stability badges', 'check-readme-badge.mjs'],
  ['coverage floor per tier', 'check-coverage-floor.mjs'],
  ['promotion RFC for stable', 'check-promotion-rfc.mjs'],
  ['typed errors (no bare throw)', 'check-no-bare-throw.mjs'],
  ['no explicit any', 'check-no-any.mjs'],
  ['named exports only', 'check-named-exports.mjs'],
  ['file-size budgets', 'check-file-size.mjs'],
  ['src ↔ test parity', 'check-src-test-parity.mjs'],
  ['for-agents docs coverage', 'check-for-agents-coverage.mjs'],
  ['ADR/RFC index sync', 'check-doc-index.mjs'],
  ['docs locale parity', 'check-intl-parity.mjs'],
  ['ecosystem contract tests', 'ecosystem-contract.test.mjs', [], 'vitest'],
  ['ecosystem documentation quality contract', 'ecosystem-documentation-quality.test.mjs', [], 'vitest'],
  ['ecosystem documentation quality attestations', 'check-ecosystem-documentation-quality.mjs', ['--evidence-dir', 'docs/evidence/ecosystem-documentation-quality']],
  ['ecosystem count drift', 'check-count-drift.mjs'],
  ['ecosystem claims freshness', 'gen-ecosystem-claims.mjs', ['--check']],
  ['ecosystem registry sync', 'sync-ecosystem.mjs', ['--check']],
  ['product-chat Chat 0.3 adoption', 'check-product-chat-adoption.mjs'],
  ['product-chat adoption tests', 'product-chat-adoption.test.mjs', [], 'vitest'],
  ['brand token sync', 'sync-brand.mjs', ['--property', 'agentskit', '--out', 'apps/docs-next/app/brand-tokens.css', '--check']],
  ['brand token sync (landing)', 'sync-brand.mjs', ['--property', 'agentskit', '--format', 'landing', '--out', 'apps/landing/app/globals.css', '--check']],
  ['README Standard v1', 'check-readme-standard.mjs'],
  ['README Standard v1 tests', 'readme-standard.test.mjs', [], 'vitest'],
]

const failed = []

for (const [label, script, args = [], runner = 'node'] of GATES) {
  process.stdout.write(`\n▶ ${label}\n`)
  const executable = runner === 'vitest' ? 'pnpm' : process.execPath
  const runnerArgs = runner === 'vitest'
    ? ['exec', 'vitest', 'run', join(root, 'scripts', script), ...args]
    : [join(root, 'scripts', script), ...args]
  const res = spawnSync(executable, runnerArgs, {
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
