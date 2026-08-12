import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
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

test('recipe miner discovers both executable recipes and generates a blocked draft offline', () => {
  const recipes = mineRecipes(REPO_ROOT)
  assert.ok(recipes.some((recipe) => recipe.id === 'first-agent'))
  assert.ok(recipes.some((recipe) => recipe.id === 'provider-swap'))
  assert.ok(recipes.some((recipe) => recipe.id === 'coding-agent-mcp'))
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

test('coding-agent MCP recipe proves one safe command across supported hosts', () => {
  const source = readFileSync(
    join(REPO_ROOT, 'packages/mcp/fixtures/coding-agent-hosts.ts'),
    'utf8',
  )
  assert.match(source, /codex mcp add agentskit -- npx -y @agentskit\/mcp@0\.3\.3/)
  assert.match(source, /claude mcp add --scope project --transport stdio/)
  assert.match(source, /\.cursor\/mcp\.json/)
  assert.doesNotMatch(source, /--allow-shell/)
  assert.doesNotMatch(source, /--api-key/)

  const atom = runPipeline(REPO_ROOT, 'coding-agent-mcp', { runExecutable: true, gateResults: [] })
  assert.equal(atom.executable.ok, true)
  assert.equal(
    atom.executable.stdout,
    'verified hosts: claude, codex, cursor; cli tools: fetch_url, web_search',
  )
  assert.equal(atom.publish.status, 'blocked')
}, 120_000)

test('provider-swap recipe keeps one application path and a credential-free proof', () => {
  const source = readFileSync(
    join(REPO_ROOT, 'apps/docs-next/fixtures/provider-swap/agent.ts'),
    'utf8',
  )
  assert.match(source, /model: 'openrouter\/free'/)
  assert.match(source, /anthropic, gemini, groq, ollama, openai, openrouter/)
  assert.match(source, /export async function runTask\(adapter: AdapterFactory, task: string\)/)
  assert.match(source, /PROVIDER_DEFAULTS/)
  assert.doesNotMatch(source, /fetch\(/)

  const atom = runPipeline(REPO_ROOT, 'provider-swap', { runExecutable: true, gateResults: [] })
  assert.equal(atom.executable.ok, true)
  assert.match(atom.executable.stdout, /^\[demo\] Demo model received:/)
  assert.equal(atom.publish.status, 'blocked')
}, 120_000)

test('provider-swap rejects missing credentials and unknown providers before transport', () => {
  const command = [
    '--filter',
    '@agentskit/docs-next',
    'exec',
    'tsx',
    'fixtures/provider-swap/agent.ts',
  ]
  const missingKey = spawnSync('pnpm', command, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, AGENT_PROVIDER: 'openrouter', OPENROUTER_API_KEY: '' },
  })
  assert.notEqual(missingKey.status, 0)
  assert.match(missingKey.stderr, /OPENROUTER_API_KEY is required/)

  const unknown = spawnSync('pnpm', command, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, AGENT_PROVIDER: 'unknown' },
  })
  assert.notEqual(unknown.status, 0)
  assert.match(unknown.stderr, /Unsupported AGENT_PROVIDER: unknown/)
})

test('provider recipe and canonical docs stay aligned with adapter configuration', () => {
  const docsRoot = join(REPO_ROOT, 'apps/docs-next/content/docs')
  const recipe = readFileSync(join(docsRoot, 'reference/recipes/provider-swap.mdx'), 'utf8')
  for (const provider of ['openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'ollama']) {
    assert.ok(recipe.includes(`| \`${provider}\` |`))
  }
  assert.match(recipe, /adapter compatibility matrix/)

  const unsupportedOptions = {
    openai: ['organization', 'project', 'fetch'],
    anthropic: ['version', 'fetch'],
    gemini: ['apiVersion', 'fetch'],
    openrouter: ['appUrl', 'appName', 'fetch'],
    ollama: ['url', 'fetch'],
  }
  for (const [provider, options] of Object.entries(unsupportedOptions)) {
    const page = readFileSync(join(docsRoot, `data/providers/${provider}.mdx`), 'utf8')
    for (const option of options) {
      assert.ok(!page.includes(`| \`${option}\` |`))
    }
  }

  const ollama = readFileSync(join(docsRoot, 'data/providers/ollama.mdx'), 'utf8')
  const choosing = readFileSync(join(docsRoot, 'data/providers/choosing.mdx'), 'utf8')
  assert.match(ollama, /\| `baseUrl` \| `string` \| `http:\/\/localhost:11434` \|/)
  assert.match(choosing, /`ollama`\s+\| ✅\s+\| ❌ current adapter/)

  const moreProviders = readFileSync(join(docsRoot, 'reference/recipes/more-providers.mdx'), 'utf8')
  assert.match(moreProviders, /groq\(\{ apiKey: process\.env\.GROQ_API_KEY!, model: 'openai\/gpt-oss-120b' \}\)/)
  assert.doesNotMatch(moreProviders, /llama-3\.3-70b-versatile/)

  const mcpCli = readFileSync(join(REPO_ROOT, 'packages/mcp/src/cli.ts'), 'utf8')
  assert.match(mcpCli, /groq: 'openai\/gpt-oss-120b'/)
  assert.doesNotMatch(mcpCli, /groq: 'llama-3\.3-70b-versatile'/)

  const stackState = readFileSync(join(REPO_ROOT, 'apps/docs-next/lib/stack-state.ts'), 'utf8')
  assert.match(stackState, /value: 'groq'.*model: 'openai\/gpt-oss-120b'/)
  assert.doesNotMatch(stackState, /value: 'groq'.*model: 'llama-3\.3-70b-versatile'/)
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

test('shared command gates execute once while every recipe is audited', () => {
  const cache = new Map()
  const config = {
    requiredGates: [
      { id: 'local', mode: 'command', command: [process.execPath, '-e', 'process.exit(0)'] },
    ],
  }
  const first = evaluateRequiredGates(REPO_ROOT, config, 'first-agent', { commandCache: cache })
  const second = evaluateRequiredGates(REPO_ROOT, config, 'provider-swap', { commandCache: cache })
  assert.equal(first[0].ok, true)
  assert.equal(second[0].ok, true)
  assert.equal(cache.size, 1)
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
