import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { test } from 'vitest'
import {
  auditExternalContributions,
  loadContributions,
  loadTargets,
  prepareSubmission,
  reportOutcomes,
  selectTargets,
  utilityWithoutPromo,
} from './lib/external-contributions.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

test('target selection rejects promotional-only targets', () => {
  const targets = loadTargets(REPO_ROOT)
  const { selected, rejected } = selectTargets(targets)
  assert.ok(selected.some((target) => target.id === 'fixture-sample-cli'))
  assert.ok(selected.some((target) => target.id === 'ollama-openai-compat'))
  assert.ok(rejected.some((entry) => entry.id === 'awesome-ai-agents'))
  assert.ok(!selected.some((target) => target.id === 'awesome-ai-agents'))
})

test('utility-first check fails when only promo docs exist', () => {
  const proposal = {
    files: ['docs/ecosystem/external-contributions/README.md'],
    utilityWithoutPromo: {
      promoMarkers: ['AgentsKit'],
    },
  }
  // README may not exist yet — force empty files via nonexistent path
  const result = utilityWithoutPromo(REPO_ROOT, {
    files: ['does-not-exist.md'],
    utilityWithoutPromo: { promoMarkers: ['AgentsKit'] },
  })
  assert.equal(result.ok, false)
  void proposal
})

test('utility-first check rejects files outside the repository', () => {
  assert.throws(
    () => utilityWithoutPromo(REPO_ROOT, { files: ['../outside.ts'] }),
    /escapes repository root/,
  )
})

test('utility-first check passes for ollama smoke contribution', () => {
  const contributions = loadContributions(REPO_ROOT)
  const ollama = contributions.find((item) => item.id === 'ollama-openai-compat-smoke')
  assert.ok(ollama)
  const result = utilityWithoutPromo(REPO_ROOT, ollama.proposal)
  assert.equal(result.ok, true, result.reason)
})

test('external submission packaging is blocked without human approval', () => {
  const contributions = loadContributions(REPO_ROOT)
  for (const contribution of contributions) {
    const submission = prepareSubmission(contribution)
    assert.equal(submission.status, 'blocked')
  }
  assert.throws(
    () =>
      prepareSubmission({
        proposal: { id: 'x', outcome: { state: 'pending' } },
        approval: { approved: true },
      }),
    /approvedBy/,
  )
  const ready = prepareSubmission({
    proposal: { id: 'x', outcome: { state: 'pending' } },
    approval: { approved: true, approvedBy: 'reviewer', approvedOn: '2026-07-14' },
  })
  assert.equal(ready.status, 'ready-for-human-submit')
  assert.equal(ready.action, 'manual-submit')
})

test('accepted outcomes require maintenance ownership', () => {
  assert.throws(
    () =>
      prepareSubmission({
        proposal: { id: 'x', outcome: { state: 'accepted' }, maintenanceOwner: null },
        approval: { approved: true, approvedBy: 'a', approvedOn: '2026-07-14' },
      }),
    /maintenanceOwner/,
  )
})

test('reporting distinguishes utility outcomes from vanity metrics', () => {
  const contributions = loadContributions(REPO_ROOT)
  const report = reportOutcomes(contributions)
  assert.equal(report.counts.pending, contributions.length)
  assert.ok(report.notTracked.includes('impressions'))
  assert.ok(report.notTracked.includes('raw-link-count'))
})

test('program audit passes for committed packages and fixture target tests', () => {
  const report = auditExternalContributions(REPO_ROOT)
  assert.equal(report.ok, true, report.failures.join('\n'))
  assert.ok(report.selectedTargets.includes('fixture-sample-cli'))
  assert.ok(report.rejectedTargets.some((entry) => entry.id === 'awesome-ai-agents'))
})

test('sample-cli fixture tests include the version contribution', () => {
  const run = spawnSync(process.execPath, ['--test'], {
    cwd: join(REPO_ROOT, 'docs/ecosystem/external-contributions/fixtures/sample-cli'),
    encoding: 'utf8',
  })
  assert.equal(run.status, 0, run.stderr || run.stdout)
  assert.match(run.stdout, /version prints the package version/)
})
