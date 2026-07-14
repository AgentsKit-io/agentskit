import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'
import {
  auditContentPipeline,
  createClaimVerifierRole,
  createRepurposerRole,
  generateAtom,
  loadPipelineConfig,
  mineRecipes,
  preparePublish,
  verifyClaims,
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

  const verifier = createClaimVerifierRole()
  const repurposer = createRepurposerRole()
  assert.equal(verifier.registryAgentId, 'content-fact-checker')
  assert.equal(repurposer.registryAgentId, 'content-repurpose-matrix')
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
  const blocked = preparePublish({ id: 'x' }, { approved: false })
  assert.equal(blocked.status, 'blocked')
  assert.throws(() => preparePublish({ id: 'x' }, { approved: true }), /approvedBy/)
  const ready = preparePublish(
    { id: 'x' },
    { approved: true, approvedBy: 'reviewer', approvedOn: '2026-07-14' },
  )
  assert.equal(ready.status, 'ready-for-human-publish')
  assert.ok(ready.channels.every((channel) => channel.action !== 'auto-post'))
})

test('recipe miner discovers first-agent and pipeline generates full atom offline', () => {
  const recipes = mineRecipes(REPO_ROOT)
  assert.ok(recipes.some((recipe) => recipe.id === 'first-agent'))
  const { atom, dir } = generateAtom(REPO_ROOT, 'first-agent', { runExecutable: false })
  assert.equal(atom.id, 'first-agent')
  assert.ok(atom.variants.docsPage.includes('Verified claims'))
  assert.ok(atom.variants.shortPost.length > 20)
  assert.ok(atom.variants.thread.includes('1/'))
  assert.ok(atom.variants.communityPost.includes('Try it'))
  assert.ok(atom.storyboard.includes('Storyboard'))
  assert.equal(atom.variants.example.path, 'apps/docs-next/fixtures/first-agent/agent.ts')
  assert.equal(atom.publish.status, 'blocked')
  assert.ok(readFileSync(join(dir, 'docs.mdx'), 'utf8').includes(atom.recipe.title))
  assert.ok(readFileSync(join(dir, 'APPROVAL.json'), 'utf8').includes('"approved": false'))
})

test('repurposer preserves claim values from the ledger', () => {
  const recipe = mineRecipes(REPO_ROOT).find((entry) => entry.id === 'first-agent')
  const claims = verifyClaims(REPO_ROOT, recipe)
  assert.equal(claims.ok, true)
  const { atom } = generateAtom(REPO_ROOT, 'first-agent', { runExecutable: false })
  for (const claim of claims.verified) {
    assert.ok(
      atom.variants.docsPage.includes(String(claim.value)),
      `docs missing claim value ${claim.value}`,
    )
  }
})

test('content pipeline audit passes for the repository layout', () => {
  const report = auditContentPipeline(REPO_ROOT, { runExecutable: false })
  assert.equal(report.ok, true, report.failures.join('\n'))
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
  const report = auditContentPipeline(dir, { runExecutable: false })
  assert.equal(report.ok, false)
  assert.ok(report.failures.some((failure) => failure.includes('no recipes') || failure.includes('recipe')))
})
