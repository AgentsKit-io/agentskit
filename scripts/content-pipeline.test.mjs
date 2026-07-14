import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'
import {
  auditContentPipeline,
  evaluateRequiredGates,
  loadPipelineConfig,
  mineRecipes,
  preparePublish,
  runPipeline,
  verifyClaims,
  writeAtom,
} from './lib/content-pipeline/index.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

test('pipeline roles resolve to Registry agent ids where applicable', () => {
  const config = loadPipelineConfig(REPO_ROOT)
  const byId = Object.fromEntries(config.roles.map((role) => [role.id, role]))
  assert.equal(byId['claim-verifier'].registryAgentId, 'content-fact-checker')
  assert.equal(byId['content-repurposer'].registryAgentId, 'content-repurpose-matrix')
  assert.equal(byId['visual-storyboarder'].registryAgentId, 'content-youtube-metadata')
  assert.equal(byId['ecosystem-linker'].registryAgentId, 'content-internal-link-planner')
  assert.equal(byId['post-reviewer'].registryAgentId, 'content-style-guide-enforcer')
  assert.equal(byId.publisher.agentskitContract, 'policy-gated')

})

test('claim verifier rejects invented claims', () => {
  const recipe = {
    id: 'x',
    claims: [{ productId: 'agentskit', claimId: 'not-a-real-claim' }],
  }
  const result = verifyClaims(REPO_ROOT, recipe)
  assert.equal(result.ok, false)
  assert.ok(result.failures[0].includes('missing claim'))
})

test('publisher refuses publish packaging without human approval', () => {
  const atom = {
    id: 'x',
    contentDigest: 'sha256:reviewed',
    executable: { ok: true },
    recipe: { citations: [{ href: 'source' }] },
    review: { checklist: [{ id: 'claims', ok: true }] },
  }
  const blocked = preparePublish(atom, { approved: false })
  assert.equal(blocked.status, 'blocked')
  assert.throws(() => preparePublish(atom, { approved: true }), /approvedBy/)
  const ready = preparePublish(
    atom,
    { approved: true, approvedBy: 'reviewer', approvedOn: '2026-07-14', contentDigest: atom.contentDigest },
  )
  assert.equal(ready.status, 'ready-for-human-publish')
  assert.ok(ready.channels.every((channel) => channel.action !== 'auto-post'))
  assert.throws(
    () => preparePublish(atom, { approved: true, approvedBy: 'reviewer', approvedOn: '2026-07-14', contentDigest: 'sha256:stale' }),
    /does not match/,
  )
})

test('recipe miner discovers first-agent and pipeline generates a blocked draft offline', () => {
  const recipes = mineRecipes(REPO_ROOT)
  assert.ok(recipes.some((recipe) => recipe.id === 'first-agent'))
  const atom = runPipeline(REPO_ROOT, 'first-agent', { runExecutable: false, gateResults: [] })
  assert.equal(atom.id, 'first-agent')
  assert.ok(atom.variants.docsPage.includes('Verified claims'))
  assert.ok(atom.variants.shortPost.length > 20)
  assert.ok(atom.variants.thread.includes('1/'))
  assert.ok(atom.variants.communityPost.includes('Try it'))
  assert.ok(atom.storyboard.includes('Storyboard'))
  assert.equal(atom.variants.example.path, 'apps/docs-next/fixtures/first-agent/agent.ts')
  assert.equal(atom.publish.status, 'blocked')
  assert.equal(atom.executable.ok, false)
  assert.match(atom.contentDigest, /^sha256:/)
})

test('repurposer preserves claim values from the ledger', () => {
  const recipe = mineRecipes(REPO_ROOT).find((entry) => entry.id === 'first-agent')
  const claims = verifyClaims(REPO_ROOT, recipe)
  assert.equal(claims.ok, true)
  const atom = runPipeline(REPO_ROOT, 'first-agent', { runExecutable: false, gateResults: [] })
  for (const claim of claims.verified) {
    assert.ok(
      atom.variants.docsPage.includes(String(claim.value)),
      `docs missing claim value ${claim.value}`,
    )
  }
})

test('skipping executable or required command gates never produces a passing audit', () => {
  const report = auditContentPipeline(REPO_ROOT, { runExecutable: false, runRequiredGates: false })
  assert.equal(report.ok, false)
  assert.ok(report.failures.some((failure) => failure.includes('executable verification was not run')))
  assert.ok(report.failures.some((failure) => failure.includes('doc-bridge command was not run')))
})

test('required gates execute commands and require evidence-backed human attestations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ak-content-gates-'))
  mkdirSync(join(dir, 'docs/ecosystem/content-pipeline/atoms/first-agent'), { recursive: true })
  writeFileSync(join(dir, 'docs/ecosystem/content-pipeline/atoms/first-agent/APPROVAL.json'), JSON.stringify({
    approved: false,
    requiredGates: {
      review: { status: 'pass', evidence: ['review://123'] },
    },
  }))
  const results = evaluateRequiredGates(dir, {
    requiredGates: [
      { id: 'local', mode: 'command', command: [process.execPath, '-e', 'process.exit(0)'] },
      { id: 'review', mode: 'human-attestation' },
      { id: 'missing', mode: 'human-attestation' },
    ],
  }, 'first-agent')
  assert.equal(results.find((gate) => gate.id === 'local').ok, true)
  assert.equal(results.find((gate) => gate.id === 'review').ok, true)
  assert.equal(results.find((gate) => gate.id === 'missing').ok, false)
})

test('atom writes never overwrite an existing approval', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ak-content-approval-'))
  const approvalDir = join(dir, 'docs/ecosystem/content-pipeline/atoms/x')
  mkdirSync(approvalDir, { recursive: true })
  const approval = '{"approved":true,"sentinel":"preserve"}\n'
  writeFileSync(join(approvalDir, 'APPROVAL.json'), approval)
  writeAtom(dir, {
    id: 'x',
    variants: {
      docsPage: '# docs\n',
      shortPost: 'short',
      thread: 'thread',
      communityPost: 'community',
      example: { path: 'fixture.ts', commands: [] },
    },
    storyboard: '# storyboard\n',
    review: { status: 'needs-human-review', checklist: [] },
    publish: { status: 'blocked', reason: 'approval required' },
  })
  assert.equal(readFileSync(join(approvalDir, 'APPROVAL.json'), 'utf8'), approval)
})

test('empty recipe source fails closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ak-content-'))
  mkdirSync(join(dir, 'docs/ecosystem/content-pipeline/recipes'), { recursive: true })
  writeFileSync(
    join(dir, 'docs/ecosystem/content-pipeline/pipeline.json'),
    readFileSync(join(REPO_ROOT, 'docs/ecosystem/content-pipeline/pipeline.json'), 'utf8'),
  )
  writeFileSync(join(dir, 'ecosystem-claims.json'), JSON.stringify({ products: [] }))
  writeFileSync(join(dir, 'ecosystem.json'), JSON.stringify({ products: [] }))
  const report = auditContentPipeline(dir, { runExecutable: false, runRequiredGates: false })
  assert.equal(report.ok, false)
  assert.ok(report.failures.some((failure) => failure.includes('no recipes') || failure.includes('recipe')))
})
