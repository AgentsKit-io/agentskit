import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'
import {
  auditLaunchPackage,
  parseLaunchPackage,
  readReadinessOverall,
  readReadinessReport,
} from './lib/launch-package.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

test('launch package schema requires demos, funnel, metrics, and HITL', () => {
  assert.throws(() => parseLaunchPackage({}), /schemaVersion/)
  const pkg = JSON.parse(
    readFileSync(join(REPO_ROOT, 'docs/ecosystem/launch/launch-package.json'), 'utf8'),
  )
  const parsed = parseLaunchPackage(pkg)
  assert.equal(parsed.demos.length, 3)
  assert.ok(parsed.funnel.length >= 4)
  assert.ok(parsed.metrics.some((metric) => metric.id === 'contribution'))
})

test('three-command demos reference generated claims only where declared', () => {
  const pkg = JSON.parse(
    readFileSync(join(REPO_ROOT, 'docs/ecosystem/launch/launch-package.json'), 'utf8'),
  )
  const claims = JSON.parse(readFileSync(join(REPO_ROOT, 'ecosystem-claims.json'), 'utf8'))
  const known = new Set(
    claims.products.flatMap((product) =>
      (product.claims ?? []).map((claim) => `${product.productId}:${claim.id}`),
    ),
  )
  for (const demo of pkg.demos) {
    assert.equal(demo.commands.length, 3)
    for (const ref of demo.claims ?? []) {
      assert.ok(known.has(`${ref.productId}:${ref.claimId}`), `missing ${ref.productId}:${ref.claimId}`)
    }
  }
})

test('launch timing remains blocked while readiness is not ready', () => {
  const overall = readReadinessOverall(
    REPO_ROOT,
    'artifacts/ecosystem-readiness/latest.json',
    'blocked',
  )
  // Artifact may be missing on a clean branch — treat missing as blocked.
  assert.notEqual(overall, 'ready')

  const pkg = JSON.parse(
    readFileSync(join(REPO_ROOT, 'docs/ecosystem/launch/launch-package.json'), 'utf8'),
  )
  assert.equal(pkg.hitl.launchTimingApproved, false)
  assert.equal(pkg.hitl.publicPackageApproved, false)
})

test('a hand-written or stale ready artifact cannot unlock launch timing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ak-readiness-artifact-'))
  mkdirSync(join(dir, 'artifacts'), { recursive: true })
  writeFileSync(join(dir, 'artifacts/latest.json'), JSON.stringify({ overall: 'ready' }))
  assert.equal(readReadinessReport(dir, 'artifacts/latest.json', { auditDate: '2026-07-14' }).valid, false)

  writeFileSync(join(dir, 'artifacts/latest.json'), JSON.stringify({
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    auditDate: '2026-05-01',
    overall: 'ready',
    promotionAllowed: true,
    summary: { p0: 0, p1: 0 },
    findings: [],
    products: [{ id: 'agentskit', status: 'ready' }],
  }))
  assert.equal(readReadinessReport(dir, 'artifacts/latest.json', { auditDate: '2026-07-14', maxAgeDays: 30 }).valid, false)
})

test('approving launch timing while readiness is blocked fails the audit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ak-launch-'))
  // Minimal fake tree
  mkdirSync(join(dir, 'docs/ecosystem/launch'), { recursive: true })
  mkdirSync(join(dir, 'apps/docs-next/content/docs/reference/contribute'), { recursive: true })
  mkdirSync(join(dir, 'apps/docs-next/app/community'), { recursive: true })
  mkdirSync(join(dir, 'artifacts/ecosystem-readiness'), { recursive: true })

  writeFileSync(
    join(dir, 'artifacts/ecosystem-readiness/latest.json'),
    JSON.stringify({ overall: 'blocked' }),
  )
  writeFileSync(join(dir, 'ecosystem-claims.json'), JSON.stringify({
    schemaVersion: 1,
    products: [{ productId: 'agentskit', claims: [{ id: 'packages', value: 25 }, { id: 'framework-bindings', value: 7 }, { id: 'recipes', value: 3 }] }],
  }))
  writeFileSync(join(dir, 'ecosystem.json'), JSON.stringify({
    schemaVersion: 2,
    products: [
      { id: 'agentskit' },
      { id: 'registry' },
      { id: 'playbook' },
    ],
  }))
  writeFileSync(join(dir, 'docs/ecosystem/launch/announcement.md'), '# draft\n')
  writeFileSync(join(dir, 'docs/ecosystem/launch/contribution-matrix.json'), JSON.stringify({
    schemaVersion: 1,
    repositories: [{ id: 'agentskit', repo: 'AgentsKit-io/agentskit', localRoot: '.', required: ['ecosystem.json'] }],
  }))
  for (const name of [
    'newcomer-journey.mdx',
    'recipe-submission.mdx',
    'maintainer-expectations.mdx',
    'launch-metrics.mdx',
  ]) {
    writeFileSync(join(dir, 'apps/docs-next/content/docs/reference/contribute', name), '---\ntitle: x\n---\n')
  }
  writeFileSync(join(dir, 'apps/docs-next/app/community/page.tsx'), 'export default function Page(){return null}')

  const base = JSON.parse(
    readFileSync(join(REPO_ROOT, 'docs/ecosystem/launch/launch-package.json'), 'utf8'),
  )
  base.hitl.launchTimingApproved = true
  base.hitl.approvedBy = 'tester'
  base.hitl.approvedOn = '2026-07-14'
  writeFileSync(join(dir, 'docs/ecosystem/launch/launch-package.json'), JSON.stringify(base, null, 2))

  const report = auditLaunchPackage(dir, { runExecutables: false })
  assert.equal(report.ok, false)
  assert.ok(report.failures.some((failure) => failure.includes('launchTimingApproved')))
})

test('skipping executable demos can never produce a passing launch audit', () => {
  const report = auditLaunchPackage(REPO_ROOT, { runExecutables: false })
  assert.equal(report.ok, false)
  assert.equal(report.failures.filter((failure) => failure.includes('verification was not run')).length, 3)
  assert.equal(report.launchTimingAllowed, false)
})
