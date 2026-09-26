import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'
import {
  CANONICAL_PRODUCTS,
  evaluateDocumentationQuality,
  evaluateDocumentationQualityMatrix,
  countDocumentationWords,
  parseDocumentationQualityProfile,
  verifyAttestedCommit,
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

test('the committed profile preserves the strict six-product contract', () => {
  const parsed = parseDocumentationQualityProfile(profile)
  assert.equal(parsed.productIds.length, 6)
  assert.equal(parsed.revision, '1.2')
  assert.equal(parsed.docBridge.minimumDoctorScore, 90)
  assert.equal(parsed.docBridge.requireExactCoverage, true)
  assert.equal(parsed.docBridge.allowExceptions, false)
  assert.deepEqual(parsed.discovery.ecosystemComponentExcludedProducts, [])
})

test('product overrides can define a CLI surface without relaxing the global default', () => {
  const cliProfile = structuredClone(profile)
  cliProfile.productOverrides = {
    registry: {
      narrative: { readmeWordBudget: { minimum: 150, maximum: 1800 } },
      discovery: { requireGlobalProductMesh: false, requireSiblingDestinations: false, contextualHooks: {} },
    },
    'code-review': {
      machineSurfaces: ['rawSources', 'forAgents'],
      discovery: { requireGlobalProductMesh: false, contextualHooks: {} },
    },
  }
  const parsed = parseDocumentationQualityProfile(cliProfile)
  assert.deepEqual(parsed.productOverrides['code-review'].machineSurfaces, ['rawSources', 'forAgents'])

  const input = evidence({
    productId: 'code-review',
    repo: 'AgentsKit-io/code-review',
    machineSurfaces: {
      rawSources: ['README.md'],
      forAgents: 'agents/code-review/agent.ts',
    },
    narrative: {
      readme: 'README.md',
      readmeWordCount: 900,
      humanDocs: 'README.md',
      forAgents: 'agents/code-review/agent.ts',
      keyJourneys: [
        { id: 'one', path: 'README.md', wordCount: 500, visualDecision: 'runnable-example', evidence: ['README.md'] },
        { id: 'two', path: 'README.md', wordCount: 500, visualDecision: 'runnable-example', evidence: ['README.md'] },
        { id: 'three', path: 'README.md', wordCount: 500, visualDecision: 'runnable-example', evidence: ['README.md'] },
      ],
    },
    discovery: {
      globalProductIds: [],
      siblingProductIds: [],
      contextualHooks: [],
    },
  })
  const result = evaluateDocumentationQuality(cliProfile, input)
  assert.equal(result.findings.some((finding) => finding.id === 'missing-machine-surface:llmsTxt'), false)
  assert.equal(result.findings.some((finding) => finding.id === 'global-products'), false)
  assert.equal(result.findings.some((finding) => finding.id.startsWith('contextual-hook:')), false)

  const registryInput = evidence({
    productId: 'registry',
    repo: 'AgentsKit-io/agentskit-registry',
    narrative: { ...evidence().narrative, readmeWordCount: 166 },
    discovery: { globalProductIds: [], siblingProductIds: [], contextualHooks: [] },
  })
  const registryResult = evaluateDocumentationQuality(cliProfile, registryInput)
  assert.equal(registryResult.findings.some((finding) => finding.id === 'readme-budget'), false)
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

test('the doctor score is a floor, not an equality', () => {
  const atTheBoundary = evidence()
  atTheBoundary.docBridge.doctorScore = 90
  assert.equal(evaluateDocumentationQuality(profile, atTheBoundary).findings.some((finding) => finding.id === 'doc-bridge-score'), false)

  // What the retrieval dimensions actually cost a well-documented repository.
  const measured = evidence()
  measured.docBridge.doctorScore = 95
  assert.equal(evaluateDocumentationQuality(profile, measured).findings.some((finding) => finding.id === 'doc-bridge-score'), false)

  const below = evidence()
  below.docBridge.doctorScore = 89
  const result = evaluateDocumentationQuality(profile, below)
  assert.equal(result.eligible, false)
  assert.ok(result.findings.some((finding) => finding.id === 'doc-bridge-score'))
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
  missingHook.discovery.contextualHooks = missingHook.discovery.contextualHooks.filter((hook) => hook.id !== 'documentation')
  const result = evaluateDocumentationQuality(profile, missingHook)
  assert.ok(result.findings.some((finding) => finding.id === 'contextual-hook:documentation'))
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
    payload.discovery.siblingProductIds = profile.productIds.filter((id) => id !== productId)
    return payload
  })
  const result = evaluateDocumentationQualityMatrix(stableProfile, payloads)
  assert.equal(result.productCount, 6)
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
  assert.ok(result.findings.some((finding) => finding.id === 'missing-product:code-review'))
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

/*
 * The budget is for two live Doc Bridge runs over this whole repository — `doctor` and
 * Documentation Standard v1 conformance — not for an assertion. Sixty seconds fitted while the
 * analyzer indexed only the `for-agents` pages; from 1.10.0 it indexes every document, and the two
 * runs together take a little over two minutes here. The test's job is to verify the contract, so
 * the budget follows the corpus rather than capping it.
 */
test('verified local content digest and Doc Bridge artifact are required for certification', { timeout: 360_000 }, () => {
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

// Git fixtures must never touch the repository under test. Hooks (pre-push, pre-commit) export
// GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE and friends, which would redirect every command below to
// the real repository, so the fixture runs git with all GIT_* variables removed, no system or
// global config, a temporary HOME, and the temp directory as its working directory.
function isolatedGitEnv(home) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')))
  return { ...env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(home, '.gitconfig') }
}

function gitRepo() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'agentskit-attestation-')))
  const home = mkdtempSync(join(tmpdir(), 'agentskit-attestation-home-'))
  writeFileSync(join(home, '.gitconfig'), '')
  const env = isolatedGitEnv(home)
  const run = (args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' }).trim()
  run(['init', '-q', '-b', 'main'])
  const gitDir = realpathSync(resolve(root, run(['rev-parse', '--git-dir'])))
  if (gitDir !== join(root, '.git')) {
    throw new Error(`git fixture escaped its temp directory: ${gitDir} is not inside ${root}`)
  }
  const git = (...args) => {
    if (realpathSync(resolve(root, run(['rev-parse', '--git-dir']))) !== gitDir) {
      throw new Error('git fixture repository changed underneath the test')
    }
    return run(args)
  }
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  git('config', 'commit.gpgsign', 'false')
  writeFileSync(join(root, 'README.md'), 'base\n')
  git('add', '.')
  git('commit', '-q', '-m', 'base')
  return { root, git }
}

function squashMergedFixture() {
  const { root, git } = gitRepo()
  git('switch', '-q', '-c', 'feature')
  writeFileSync(join(root, 'README.md'), 'certified\n')
  git('commit', '-q', '-am', 'certify')
  const attested = git('rev-parse', 'HEAD')
  git('switch', '-q', 'main')
  git('merge', '-q', '--squash', 'feature')
  git('commit', '-q', '-m', 'squash')
  let ancestor = true
  try { git('merge-base', '--is-ancestor', attested, 'HEAD') } catch { ancestor = false }
  assert.equal(ancestor, false)
  return { root, git, attested }
}

test('a squash-merged attestation commit is accepted while the certified paths are unchanged', () => {
  const { root, attested } = squashMergedFixture()
  assert.deepEqual(verifyAttestedCommit(root, attested, ['README.md'], { digestMatches: true }), [])
}, 30_000)

test('a squash-merged attestation commit fails once certified content diverges', () => {
  const { root, git, attested } = squashMergedFixture()
  writeFileSync(join(root, 'README.md'), 'edited after certification\n')
  git('commit', '-q', '-am', 'edit')
  const findings = verifyAttestedCommit(root, attested, ['README.md'], { digestMatches: false })
  assert.deepEqual(findings.map((finding) => finding.id), ['attestation-commit'])
}, 30_000)

test('an ancestor attestation commit still reports drift on certified paths', () => {
  const { root, git } = gitRepo()
  const attested = git('rev-parse', 'HEAD')
  writeFileSync(join(root, 'README.md'), 'changed\n')
  git('commit', '-q', '-am', 'change')
  const findings = verifyAttestedCommit(root, attested, ['README.md'], { digestMatches: false })
  assert.deepEqual(findings.map((finding) => finding.id), ['attestation-commit-drift'])
  assert.deepEqual(verifyAttestedCommit(root, attested, ['other.md'], { digestMatches: true }), [])
}, 30_000)

test('an unreachable attestation commit is accepted only while the content digest matches', () => {
  const { root } = gitRepo()
  const missing = 'f'.repeat(40)
  assert.deepEqual(verifyAttestedCommit(root, missing, ['README.md'], { digestMatches: true }), [])
  assert.deepEqual(verifyAttestedCommit(root, missing, ['README.md'], { digestMatches: false }).map((finding) => finding.id), ['attestation-commit'])
}, 30_000)
