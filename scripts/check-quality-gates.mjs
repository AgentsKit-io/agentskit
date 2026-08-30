#!/usr/bin/env node
/**
 * Quality-gate orchestrator. Runs every structural gate in sequence and
 * reports a single pass/fail summary. These checks protect the codebase's
 * non-negotiables; the content-pipeline fixture has one explicit local build
 * precondition because it exercises the published adapter entrypoint.
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
  ['stable internal dependencies', 'check-stable-dependencies.mjs'],
  ['stability graduation evidence', 'check-stability-evidence.mjs'],
  ['release registry preflight helpers', 'release-registry.test.mjs'],
  ['release workflow authentication', 'release-workflow-auth.test.mjs'],
  ['typed errors (no bare throw)', 'check-no-bare-throw.mjs'],
  ['no explicit any', 'check-no-any.mjs'],
  ['no newly introduced nested ternaries', 'check-no-nested-ternary.mjs'],
  ['named exports only', 'check-named-exports.mjs'],
  ['file-size budgets', 'check-file-size.mjs'],
  ['src ↔ test parity', 'check-src-test-parity.mjs'],
  ['for-agents docs coverage', 'check-for-agents-coverage.mjs'],
  ['ADR/RFC index sync', 'check-doc-index.mjs'],
  ['docs locale parity', 'check-intl-parity.mjs'],
  ['content pipeline tests', 'content-pipeline.test.mjs', [], 'vitest'],
  ['nested ternary detector tests', 'check-no-nested-ternary.test.mjs', [], 'vitest'],
  ['models.dev catalog tests', 'models-dev-catalog.test.mjs', [], 'vitest'],
  ['models.dev refresh workflow contract', 'models-dev-workflow.test.mjs', [], 'vitest'],
  ['models.dev snapshot freshness', 'check-models-dev-freshness.mjs'],
  ['verified recipe factory', 'check-content-pipeline.mjs'],
  ['ecosystem contract tests', 'ecosystem-contract.test.mjs', [], 'vitest'],
  ['software metadata tests', 'software-metadata.test.mjs', [], 'vitest'],
  ['software metadata freshness', 'generate-software-metadata.mjs', ['--check']],
  ['ecosystem documentation quality contract', 'ecosystem-documentation-quality.test.mjs', [], 'vitest'],
  ['ecosystem documentation quality attestations', 'check-ecosystem-documentation-quality.mjs', ['--evidence-dir', 'docs/evidence/ecosystem-documentation-quality']],
  ['ecosystem count drift', 'check-count-drift.mjs'],
  ['ecosystem claims freshness', 'gen-ecosystem-claims.mjs', ['--check']],
  ['ecosystem registry sync', 'sync-ecosystem.mjs', ['--check']],
  ['semantic authority', 'check-semantic-authority.mjs'],
  ['product-chat Chat 0.4 adoption', 'check-product-chat-adoption.mjs'],
  ['canonical package doc versions', 'check-doc-package-versions.mjs'],
  ['product-chat adoption tests', 'product-chat-adoption.test.mjs', [], 'vitest'],
  ['brand token sync', 'sync-brand.mjs', ['--property', 'agentskit', '--out', 'apps/docs-next/app/brand-tokens.css', '--check']],
  ['brand token sync (landing)', 'sync-brand.mjs', ['--property', 'agentskit', '--format', 'landing', '--out', 'apps/landing/app/globals.css', '--check']],
  ['README Standard v1', 'check-readme-standard.mjs'],
  ['README Standard v1 tests', 'readme-standard.test.mjs', [], 'vitest'],
]

const failed = []

process.stdout.write('\n▶ adapters package build precondition\n')
const adapterBuild = spawnSync('pnpm', ['--filter', '@agentskit/adapters', 'build'], { stdio: 'inherit', cwd: root })
if (adapterBuild.status !== 0) failed.push('adapters package build precondition')

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
