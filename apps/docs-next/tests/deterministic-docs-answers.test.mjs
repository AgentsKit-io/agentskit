import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createDeterministicAnswerAdapter, createDeterministicAnswerResolver } from '@agentskit/chat'
import {
  DETERMINISTIC_ARTIFACT_MAX_BYTES,
  decodeAssistantContent,
  decodeDeterministicSiteConfig,
  verifyLocalKnowledgeArtifactSync,
} from '@agentskit/chat-protocol'
import { test } from 'vitest'
import { REPO_ROOT } from '../../../scripts/compute-stats.mjs'

const artifactPath = join(REPO_ROOT, 'apps/docs-next/lib/deterministic-knowledge.generated.json')
const sitePath = join(REPO_ROOT, 'apps/docs-next/lib/deterministic-site.generated.json')
const read = path => readFileSync(join(REPO_ROOT, path), 'utf8')
const load = () => {
  const site = decodeDeterministicSiteConfig(JSON.parse(readFileSync(sitePath, 'utf8')))
  assert.equal(site.ok, true, site.ok ? undefined : site.diagnostic.message)
  const artifact = verifyLocalKnowledgeArtifactSync(JSON.parse(readFileSync(artifactPath, 'utf8')), {
    expectedContentHash: site.value.artifact.contentHash,
    expectedSiteId: site.value.siteId,
  })
  assert.equal(artifact.ok, true, artifact.ok ? undefined : artifact.diagnostic.message)
  return { site: site.value, artifact: artifact.value }
}
const message = content => ({ id: 'user-1', role: 'user', content, status: 'complete', createdAt: new Date(0) })
const request = content => ({ messages: [message(content)], context: { systemPrompt: 'Keep me', metadata: { tenant: 'docs' } } })
const collect = async source => {
  const chunks = []
  for await (const chunk of source.stream()) chunks.push(chunk)
  return chunks
}

test('the generated artifact is schema-valid, hash-anchored, compact, and content-addressed', () => {
  const { site, artifact } = load()
  const bytes = new TextEncoder().encode(readFileSync(artifactPath)).byteLength
  assert.ok(bytes <= 96 * 1024, `${bytes} exceeds the 96 KiB product budget`)
  assert.ok(bytes <= DETERMINISTIC_ARTIFACT_MAX_BYTES)
  assert.ok(artifact.entries.length >= 90)
  assert.match(site.artifact.href, new RegExp(`${artifact.contentHash.slice(7)}\\.json$`))
  assert.equal(
    readFileSync(join(REPO_ROOT, 'apps/docs-next/public', site.artifact.href), 'utf8'),
    readFileSync(artifactPath, 'utf8'),
  )
  assert.deepEqual(
    new Set(artifact.entries.map(entry => entry.kind)),
    new Set(['command', 'package', 'document', 'contribution', 'ecosystem', 'restricted-faq']),
  )
})

test('generation is byte-identical for unchanged canonical inputs', () => {
  const beforeArtifact = readFileSync(artifactPath, 'utf8')
  const beforeSite = readFileSync(sitePath, 'utf8')
  const generated = spawnSync('pnpm', ['--filter', '@agentskit/docs-next', 'gen:deterministic-knowledge'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  assert.equal(generated.status, 0, generated.stderr)
  assert.equal(readFileSync(artifactPath, 'utf8'), beforeArtifact)
  assert.equal(readFileSync(sitePath, 'utf8'), beforeSite)
})

test('exact, ambiguous, and reasoning queries follow the conservative confidence contract', () => {
  const { site, artifact } = load()
  const resolver = createDeterministicAnswerResolver(artifact, {
    expectedContentHash: site.artifact.contentHash,
    expectedSiteId: site.siteId,
  })
  assert.deepEqual(resolver.resolve('  HOW   DO I INSTALL AGENTSKIT? ').confidence, { level: 'high', basis: 'exact' })
  assert.match(resolver.resolve('install agentskit').answer.markdown, /pnpm add @agentskit\/core/)
  assert.deepEqual(resolver.resolve('core').confidence, { level: 'medium', basis: 'ambiguous' })
  for (const query of ['compare AgentsKit with LangGraph', 'recommend the best provider', 'why did my agent fail in production?']) {
    assert.deepEqual(resolver.resolve(query).confidence, { level: 'low', basis: 'miss' })
  }
})

test('known questions render locally with citations and make zero backend requests', async () => {
  const { site, artifact } = load()
  let backendRequests = 0
  const fallback = {
    createSource() {
      backendRequests += 1
      return { async *stream() { yield { type: 'done' } }, abort() {} }
    },
  }
  const adapter = createDeterministicAnswerAdapter({
    artifact,
    expectedContentHash: site.artifact.contentHash,
    expectedSiteId: site.siteId,
    fallbackMode: 'backend',
    fallback,
  })
  const chunks = await collect(adapter.createSource(request('How do I install AgentsKit?')))
  assert.equal(backendRequests, 0)
  assert.equal(chunks.find(chunk => chunk.metadata?.answer)?.metadata.answer.provenance.source, 'local')
  const decoded = decodeAssistantContent(chunks.find(chunk => chunk.type === 'text').content)
  assert.equal(decoded.ok, true)
  assert.ok(decoded.parts.some(part => part.kind === 'component' && part.frame.componentKey === 'source-list'))
})

test('a miss calls the backend once with the original conversation and safe escalation metadata', async () => {
  const { site, artifact } = load()
  const delegated = []
  const fallback = {
    createSource(value) {
      delegated.push(value)
      return { async *stream() { yield { type: 'text', content: 'Backend answer.' }; yield { type: 'done' } }, abort() {} }
    },
  }
  const adapter = createDeterministicAnswerAdapter({
    artifact,
    expectedContentHash: site.artifact.contentHash,
    expectedSiteId: site.siteId,
    fallbackMode: 'backend',
    fallback,
  })
  const original = request('Compare AgentsKit with another framework')
  const chunks = await collect(adapter.createSource(original))
  assert.equal(delegated.length, 1)
  assert.deepEqual(delegated[0].messages, original.messages)
  assert.deepEqual(delegated[0].context.metadata['agentskit.chat.escalation'].confidence, { level: 'low', basis: 'miss' })
  assert.equal(chunks.at(-1).metadata.answer.provenance.source, 'backend')
})

test('local resolution stays below 50 ms p95 in the supported test environment', () => {
  const { site, artifact } = load()
  const resolver = createDeterministicAnswerResolver(artifact, {
    expectedContentHash: site.artifact.contentHash,
    expectedSiteId: site.siteId,
  })
  const samples = []
  for (let index = 0; index < 1_000; index += 1) {
    const start = performance.now()
    resolver.resolve(index % 2 === 0 ? 'install agentskit' : 'unknown exact fixture')
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  const p95 = samples[Math.floor(samples.length * 0.95)]
  assert.ok(p95 < 50, `deterministic p95 was ${p95.toFixed(3)} ms`)
})

test('the real widget composes published AgentsChat local-first contracts', () => {
  const widget = read('apps/docs-next/components/docs/ask-widget.tsx')
  const rootPackage = read('package.json')
  const docsPackage = read('apps/docs-next/package.json')
  assert.match(widget, /createDeterministicAnswerAdapter/)
  assert.match(widget, /choiceSubmission: adapter\.resolveChoiceSubmission/)
  assert.match(widget, /fallbackMode: deterministicSite\.fallback\.mode/)
  assert.match(widget, /data-ak-answer-path/)
  assert.match(docsPackage, /"@agentskit\/chat": "0\.1\.0"/)
  assert.match(docsPackage, /"@agentskit\/chat-protocol": "0\.1\.0"/)
  assert.match(docsPackage, /"@agentskit\/chat-react": "0\.1\.0"/)
  assert.doesNotMatch(rootPackage, /"@agentskit\/chat(?:-protocol)?":/)
  assert.doesNotMatch(widget, /function normalizeDeterministic|new Map<string, DeterministicKnowledgeEntry/)
})
