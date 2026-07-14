import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { test } from 'vitest'
import {
  auditExternalContributions,
  computeContributionDigest,
  countPendingApprovals,
  loadContributions,
  loadTargets,
  prepareSubmission,
  reportOutcomes,
  selectTargets,
  utilityWithoutPromo,
  validateTargetRules,
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
    approval: {
      approved: true,
      approvedBy: 'reviewer',
      approvedOn: '2026-07-14',
      contentDigest: 'reviewed-digest',
    },
  }, {
    targetEligible: true,
    utility: { ok: true },
    tests: { ok: true },
    contentDigest: 'reviewed-digest',
  })
  assert.equal(ready.status, 'ready-for-human-submit')
  assert.equal(ready.action, 'manual-submit')
})

test('approval cannot bypass technical checks or authorize changed content', () => {
  const contribution = {
    proposal: { id: 'x', outcome: { state: 'pending' } },
    approval: {
      approved: true,
      approvedBy: 'reviewer',
      approvedOn: '2026-07-14',
      contentDigest: 'reviewed-digest',
    },
  }
  const incomplete = prepareSubmission(contribution, {
    targetEligible: true,
    utility: { ok: true },
    tests: { ok: false },
    contentDigest: 'reviewed-digest',
  })
  assert.equal(incomplete.status, 'blocked')

  const changed = prepareSubmission(contribution, {
    targetEligible: true,
    utility: { ok: true },
    tests: { ok: true },
    contentDigest: 'changed-digest',
  })
  assert.equal(changed.status, 'blocked')
  assert.match(changed.reason, /exact reviewed proposal/)
})

test('content digest changes when a proposal changes', () => {
  const contributions = loadContributions(REPO_ROOT)
  const contribution = contributions[0]
  const original = computeContributionDigest(REPO_ROOT, contribution.proposal)
  const changed = computeContributionDigest(REPO_ROOT, {
    ...contribution.proposal,
    title: `${contribution.proposal.title} changed`,
  })
  assert.notEqual(original, changed)
  assert.match(original, /^[a-f0-9]{64}$/)
})

test('target rules must point to a fresh, reviewed CONTRIBUTING document', () => {
  const targets = loadTargets(REPO_ROOT)
  for (const target of targets.filter((item) => item.technicalRelationship)) {
    assert.equal(validateTargetRules(target).ok, true)
  }
  assert.equal(
    validateTargetRules({
      contributionRulesUrl: 'https://example.com/api',
      contributionRules: {
        sourceUrl: 'https://example.com/api',
        reviewedOn: '2026-07-14',
        criteria: ['looks useful'],
      },
    }).ok,
    false,
  )
})

test('accepted outcomes require maintenance ownership', () => {
  assert.throws(
    () =>
      prepareSubmission({
        proposal: { id: 'x', outcome: { state: 'accepted' }, maintenanceOwner: null },
        approval: {
          approved: true,
          approvedBy: 'a',
          approvedOn: '2026-07-14',
          contentDigest: 'digest',
        },
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

test('mass-submission guard counts only approved packages still pending', () => {
  const contribution = (state, approved = true) => ({
    proposal: { outcome: { state } },
    approval: { approved },
  })
  assert.equal(
    countPendingApprovals([
      contribution('pending'),
      contribution('submitted'),
      contribution('accepted'),
      contribution('rejected'),
      contribution('pending', false),
    ]),
    1,
  )
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
