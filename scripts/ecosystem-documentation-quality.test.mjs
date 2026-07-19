import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'
import {
  CANONICAL_PRODUCTS,
  evaluateDocumentationQuality,
  evaluateDocumentationQualityMatrix,
  countDocumentationWords,
  parseDocumentationQualityProfile,
} from './lib/ecosystem-documentation-quality.mjs'

const profile = JSON.parse(readFileSync(join(REPO_ROOT, 'ecosystem-documentation-quality-v1.json'), 'utf8'))

function evidence(overrides = {}) {
  return {
    schemaVersion: 1,
    profileId: profile.id,
    profileVersion: profile.version,
    productId: 'agentskit',
    repo: 'AgentsKit-io/agentskit',
    commit: '0123456789abcdef',
    auditedOn: '2026-07-15',
    docBridge: {
      artifact: 'docs/evidence/ecosystem-documentation-quality/doc-bridge/agentskit.json',
      doctorScore: 100,
      coverage: { agent: { ready: 25, total: 25 }, human: { ready: 25, total: 25 } },
      conformance: {
        requiredPassed: 7,
        requiredTotal: 7,
        requiredExcepted: 0,
        recommendedPassed: 2,
        recommendedTotal: 2,
        recommendedExcepted: 0,
      },
    },
    attestation: {
      sourceMode: 'working-tree',
      contentDigest: `sha256:${'0'.repeat(64)}`,
    },
    machineSurfaces: {
      llmsTxt: 'llms.txt',
      llmsFullTxt: 'apps/docs-next/app/llms-full.txt/route.ts',
      rawSources: ['README.md'],
      forAgents: 'apps/docs-next/content/docs/for-agents/index.mdx',
    },
    narrative: {
      readme: 'README.md',
      readmeWordCount: 900,
      humanDocs: 'apps/docs-next/content/docs/index.mdx',
      forAgents: 'apps/docs-next/content/docs/for-agents/index.mdx',
      keyJourneys: [
        { id: 'start', path: 'start.mdx', wordCount: 500, visualDecision: 'diagram', evidence: ['start.mdx#flow'] },
        { id: 'build', path: 'build.mdx', wordCount: 600, visualDecision: 'runnable-example', evidence: ['fixtures/build'] },
        { id: 'operate', path: 'operate.mdx', wordCount: 700, visualDecision: 'not-applicable', rationale: 'A command reference is faster to scan as a table.', evidence: ['operate.mdx#commands'] },
      ],
    },
    discovery: {
      globalProductIds: [...profile.productIds],
      siblingProductIds: profile.productIds.filter((id) => id !== 'agentskit'),
      contextualHooks: Object.entries(profile.discovery.contextualHooks).map(([id, targetProductId]) => ({
        id,
        status: 'linked',
        targetProductId,
        evidence: [`docs/${id}.mdx`],
      })),
    },
    ...overrides,
  }
}

test('the committed profile preserves the strict seven-product contract', () => {
  const parsed = parseDocumentationQualityProfile(profile)
  assert.equal(parsed.productIds.length, 7)
  assert.equal(parsed.docBridge.requireExactCoverage, true)
  assert.equal(parsed.docBridge.allowExceptions, false)
  assert.deepEqual(parsed.discovery.ecosystemComponentExcludedProducts, ['akos'])
})

test('canonical identities reject product and repository drift', () => {
  const driftedProfile = structuredClone(profile)
  driftedProfile.productIds[0] = 'other'
  assert.throws(() => parseDocumentationQualityProfile(driftedProfile), /canonical ordered products/)

  const wrongRepo = evidence({ repo: 'Wrong/Repository' })
  assert.throws(() => evaluateDocumentationQuality(profile, wrongRepo), /must equal AgentsKit-io\/agentskit/)
})

test('fully exact evidence stays eligible but is not certified without verified attestation', () => {
  const result = evaluateDocumentationQuality(profile, evidence())
  assert.equal(result.eligible, true)
  assert.equal(result.certified, false)
  assert.equal(result.attestationVerified, false)
  assert.equal(result.profileStatus, 'stable')
})

test('a rounded doctor 100 cannot hide incomplete exact coverage', () => {
  const input = evidence()
  input.docBridge.coverage.agent = { ready: 346, total: 350 }
  const result = evaluateDocumentationQuality(profile, input)
  assert.equal(result.eligible, false)
  assert.ok(result.findings.some((finding) => finding.id === 'agent-coverage'))
})

test('required and recommended conformance must pass without exceptions', () => {
  const input = evidence()
  input.docBridge.conformance.requiredExcepted = 1
  input.docBridge.conformance.recommendedPassed = 1
  const result = evaluateDocumentationQuality(profile, input)
  assert.ok(result.findings.some((finding) => finding.id === 'required-conformance'))
  assert.ok(result.findings.some((finding) => finding.id === 'recommended-conformance'))
})

test('narrative budgets and the six-sibling mesh fail closed', () => {
  const input = evidence()
  input.narrative.readmeWordCount = 2383
  input.narrative.keyJourneys[0].wordCount = 50
  input.discovery.siblingProductIds = ['registry']
  const result = evaluateDocumentationQuality(profile, input)
  assert.ok(result.findings.some((finding) => finding.id === 'readme-budget'))
  assert.ok(result.findings.some((finding) => finding.id === 'journey-budget:start'))
  assert.ok(result.findings.some((finding) => finding.id === 'sibling-destinations'))
})

test('visual and contextual exceptions must be explicit', () => {
  const input = evidence()
  delete input.narrative.keyJourneys[2].rationale
  assert.throws(() => evaluateDocumentationQuality(profile, input), /rationale must be a non-empty string/)

  const missingHook = evidence()
  missingHook.discovery.contextualHooks = missingHook.discovery.contextualHooks.filter((hook) => hook.id !== 'enterprise')
  const result = evaluateDocumentationQuality(profile, missingHook)
  assert.ok(result.findings.some((finding) => finding.id === 'contextual-hook:enterprise'))
})

test('AKOS is the only product excluded from the continuation component', () => {
  const input = evidence({ productId: 'akos', repo: 'AgentsKit-io/agentskit-os' })
  input.discovery.siblingProductIds = []
  const eligible = evaluateDocumentationQuality(profile, input)
  assert.equal(eligible.findings.some((finding) => finding.id === 'excluded-component'), false)

  input.discovery.siblingProductIds = ['agentskit']
  const blocked = evaluateDocumentationQuality(profile, input)
  assert.ok(blocked.findings.some((finding) => finding.id === 'excluded-component'))
})

test('local certification detects missing paths and stale measured word counts', () => {
  const root = mkdtempSync(join(tmpdir(), 'agentskit-doc-quality-'))
  mkdirSync(join(root, 'docs'), { recursive: true })
  const prose = Array.from({ length: 250 }, (_, index) => `word${index}`).join(' ')
  writeFileSync(join(root, 'README.md'), prose)
  writeFileSync(join(root, 'docs', 'human.mdx'), prose)
  writeFileSync(join(root, 'docs', 'agents.mdx'), prose)
  writeFileSync(join(root, 'docs', 'journey.mdx'), prose)
  writeFileSync(join(root, 'llms.txt'), prose)
  writeFileSync(join(root, 'llms-full.txt'), prose)

  const input = evidence()
  input.machineSurfaces = {
    llmsTxt: 'llms.txt',
    llmsFullTxt: 'llms-full.txt',
    rawSources: ['README.md'],
    forAgents: 'docs/agents.mdx',
  }
  input.narrative = {
    readme: 'README.md',
    readmeWordCount: 900,
    humanDocs: 'docs/human.mdx',
    forAgents: 'docs/agents.mdx',
    keyJourneys: [0, 1, 2].map((index) => ({
      id: `journey-${index}`,
      path: 'docs/journey.mdx',
      wordCount: 500,
      visualDecision: 'diagram',
      evidence: ['docs/missing-diagram.mmd'],
    })),
  }
  input.discovery.contextualHooks = input.discovery.contextualHooks.map((hook) => ({ ...hook, evidence: ['docs/human.mdx'] }))

  const result = evaluateDocumentationQuality(profile, input, { root })
  assert.equal(countDocumentationWords(prose), 250)
  assert.ok(result.findings.some((finding) => finding.id === 'readme-word-count-drift'))
  assert.ok(result.findings.some((finding) => finding.id === 'journey-word-count-drift:journey-0'))
  assert.ok(result.findings.some((finding) => finding.id === 'missing-path:docs/missing-diagram.mmd'))
})

test('the stable matrix remains uncertified without verified repository attestations', () => {
  const stableProfile = { ...profile, status: 'stable' }
  const payloads = CANONICAL_PRODUCTS.map(({ id: productId, repo }) => {
    const payload = evidence({ productId, repo })
    payload.discovery.siblingProductIds = productId === 'akos'
      ? []
      : profile.productIds.filter((id) => id !== productId)
    return payload
  })
  const result = evaluateDocumentationQualityMatrix(stableProfile, payloads)
  assert.equal(result.productCount, 7)
  assert.equal(result.eligible, true)
  assert.equal(result.certified, false)
  assert.equal(result.findings.length, 0)
})

test('the matrix fails closed when a product payload or local root is missing', () => {
  const payloads = CANONICAL_PRODUCTS.slice(0, -1).map(({ id: productId, repo }) => {
    const payload = evidence({ productId, repo })
    payload.discovery.siblingProductIds = profile.productIds.filter((id) => id !== productId)
    return payload
  })
  const result = evaluateDocumentationQualityMatrix(profile, payloads, { requireRoots: true })
  assert.equal(result.eligible, false)
  assert.ok(result.findings.some((finding) => finding.id === 'missing-product:akos'))
  assert.ok(result.findings.some((finding) => finding.id === 'missing-root:agentskit'))
})

test('local semantics reject visual labels and linked hooks unsupported by content', () => {
  const root = mkdtempSync(join(tmpdir(), 'agentskit-doc-semantics-'))
  const prose = Array.from({ length: 250 }, (_, index) => `word${index}`).join(' ')
  mkdirSync(join(root, 'docs'), { recursive: true })
  for (const path of ['README.md', 'llms.txt', 'llms-full.txt']) writeFileSync(join(root, path), prose)
  for (const path of ['human.mdx', 'agents.mdx', 'journey.mdx', 'evidence.mdx']) writeFileSync(join(root, 'docs', path), prose)
  const input = evidence()
  input.narrative.readmeWordCount = 250
  input.machineSurfaces = { llmsTxt: 'llms.txt', llmsFullTxt: 'llms-full.txt', rawSources: ['README.md'], forAgents: 'docs/agents.mdx' }
  input.narrative = {
    readme: 'README.md', readmeWordCount: 250, humanDocs: 'docs/human.mdx', forAgents: 'docs/agents.mdx',
    keyJourneys: [0, 1, 2].map((index) => ({ id: `journey-${index}`, path: 'docs/journey.mdx', wordCount: 250, visualDecision: 'diagram', evidence: ['docs/evidence.mdx'] })),
  }
  input.discovery.contextualHooks = input.discovery.contextualHooks.map((hook) => ({ ...hook, evidence: ['docs/evidence.mdx'] }))
  const result = evaluateDocumentationQuality(profile, input, { root })
  assert.ok(result.findings.some((finding) => finding.id === 'journey-visual:journey-0'))
  assert.ok(result.findings.some((finding) => finding.id === 'contextual-hook-evidence:documentation'))
})

test('verified local content digest and Doc Bridge artifact are required for certification', { timeout: 60_000 }, () => {
  const committed = JSON.parse(readFileSync(join(REPO_ROOT, 'docs/evidence/ecosystem-documentation-quality/agentskit.json'), 'utf8'))
  const certified = evaluateDocumentationQuality(profile, committed, {
    root: REPO_ROOT,
    attestationRoot: REPO_ROOT,
    verifyAttestation: true,
  })
  const certificationDiagnostics = JSON.stringify(certified.findings)
  assert.equal(certified.certified, true, certificationDiagnostics)
  assert.equal(certified.attestationVerified, true, certificationDiagnostics)
  assert.equal(certified.docBridgeLiveVerified, true, certificationDiagnostics)

  const tampered = structuredClone(committed)
  tampered.attestation.contentDigest = `sha256:${'f'.repeat(64)}`
  const blocked = evaluateDocumentationQuality(profile, tampered, {
    root: REPO_ROOT,
    attestationRoot: REPO_ROOT,
    verifyAttestation: true,
  })
  assert.equal(blocked.certified, false)
  assert.ok(blocked.findings.some((finding) => finding.id === 'attestation-digest'))
  assert.ok(blocked.findings.some((finding) => finding.id === 'doc-bridge-artifact'))
})
