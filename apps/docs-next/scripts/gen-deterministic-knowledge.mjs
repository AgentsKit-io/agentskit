import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DETERMINISTIC_KNOWLEDGE_PROTOCOL,
  DETERMINISTIC_KNOWLEDGE_PROTOCOL_VERSION,
  DETERMINISTIC_SITE_PROTOCOL,
  DETERMINISTIC_SITE_PROTOCOL_VERSION,
  DETERMINISTIC_ARTIFACT_MAX_BYTES,
  DeterministicSiteConfigSchema,
  computeLocalKnowledgeArtifactContentHash,
  normalizeKnowledgeKey,
  verifyLocalKnowledgeArtifact,
} from '@agentskit/chat/protocol'

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(appRoot, '../..')
const generatedAt = process.env.DETERMINISTIC_KNOWLEDGE_GENERATED_AT ?? execFileSync(
  'git',
  ['log', '-1', '--format=%cI', '--', '.doc-bridge/index.json', 'ecosystem-claims.json', 'ecosystem.json', 'apps/docs-next/scripts/gen-deterministic-knowledge.mjs'],
  { cwd: repoRoot, encoding: 'utf8' },
).trim()
const budgetBytes = 96 * 1024

const readJson = async path => JSON.parse(await readFile(join(repoRoot, path), 'utf8'))
const safeId = value => value.toLowerCase().replace(/[^a-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
const unique = values => [...new Map(values.map(value => [normalizeKnowledgeKey(value), value.trim()])).values()]
const citation = (id, title, href) => ({ id: safeId(id), title, href })
const entry = ({ id, kind, label, values, markdown, citations }) => ({
  id: safeId(id),
  kind,
  label,
  match: { type: 'exact', values: unique(values) },
  answer: { markdown, citations },
})

const bridge = await readJson('.doc-bridge/index.json')
const claimsLedger = await readJson('ecosystem-claims.json')
const ecosystem = await readJson('ecosystem.json')
const entries = []

entries.push(
  entry({
    id: 'command.install-core',
    kind: 'command',
    label: 'Install AgentsKit core',
    values: ['How do I install AgentsKit?', 'install agentskit', 'agentskit install command'],
    markdown: 'Install the framework and provider adapters with:\n\n```bash\npnpm add @agentskit/core @agentskit/adapters\n```\n\nThe first-agent guide starts with a deterministic local adapter, so you can verify the setup without an API key or network call.',
    citations: [citation('install-guide', 'Build your first agent', '/docs/get-started/getting-started/build-your-first-agent')],
  }),
  entry({
    id: 'command.install-react',
    kind: 'command',
    label: 'Install the React binding',
    values: ['How do I install AgentsKit React?', 'install @agentskit/react', 'agentskit react install command'],
    markdown: 'Install the React binding together with the core contract:\n\n```bash\npnpm add @agentskit/core @agentskit/react\n```',
    citations: [citation('react-docs', 'React package', '/docs/reference/packages/react')],
  }),
  entry({
    id: 'faq.what-is-agentskit',
    kind: 'restricted-faq',
    label: 'What AgentsKit is',
    values: ['What is AgentsKit?', 'explain agentskit', 'agentskit overview'],
    markdown: 'AgentsKit is a TypeScript framework for building agents without gluing many libraries together. It provides one contract for models, tools, memory, runtime, evaluation, and framework bindings.',
    citations: [citation('agentskit-home', 'AgentsKit overview', '/docs')],
  }),
  entry({
    id: 'contribution.start',
    kind: 'contribution',
    label: 'Contribute to AgentsKit',
    values: ['How do I contribute to AgentsKit?', 'contribute to agentskit', 'agentskit contribution guide'],
    markdown: 'Start with the contribution guide, choose a scoped issue, and run the package-specific lint and test commands before opening a pull request.',
    citations: [citation('contribution-guide', 'Contribution guide', '/docs/reference/contribute')],
  }),
)

for (const doc of [...bridge.knowledge].sort((a, b) => a.id.localeCompare(b.id))) {
  const handoff = bridge.handoffs[doc.id]
  const humanHref = handoff?.humanDoc?.startsWith('/') ? handoff.humanDoc : `/docs/reference/packages/${doc.id}`
  const agentHref = `/${doc.path.replace(/^apps\/docs-next\/content\//, '').replace(/\.mdx$/, '')}`
  const packageName = `@agentskit/${doc.id}`
  entries.push(
    entry({
      id: `package.${doc.id}`,
      kind: 'package',
      label: `${packageName} package`,
      values: [packageName, `${doc.id} package`, doc.id],
      markdown: `**${packageName}** — ${doc.description}\n\nInstall it with \`pnpm add ${packageName}\`.`,
      citations: [citation(`package-${doc.id}`, `${packageName} documentation`, humanHref)],
    }),
    entry({
      id: `document.${doc.id}`,
      kind: 'document',
      label: `${doc.id} documentation`,
      values: [`${doc.id} documentation`, `docs for ${doc.id}`, doc.id],
      markdown: `Open the ${doc.id} documentation for purpose, exports, examples, ownership, and verification commands.`,
      citations: [citation(`document-${doc.id}`, `${doc.id} agent handoff`, agentHref)],
    }),
  )
  if (handoff) {
    entries.push(entry({
      id: `handoff.${doc.id}`,
      kind: 'contribution',
      label: `${doc.id} ownership and checks`,
      values: [`who owns ${doc.id}`, `how do i change ${doc.id}`, `${doc.id} handoff`],
      markdown: `Start at \`${handoff.startHere}\`. Edit only \`${handoff.editRoots.join('`, `')}\` for this ownership slice. Verify with:\n\n${handoff.checks.map(command => `- \`${command}\``).join('\n')}`,
      citations: [citation(`handoff-${doc.id}`, `${doc.id} handoff`, agentHref)],
    }))
  }
}

for (const product of [...ecosystem.products].sort((a, b) => a.navigation.order - b.navigation.order)) {
  const href = product.surfaces.docs ?? product.surfaces.home ?? `https://github.com/${product.repo}`
  entries.push(entry({
    id: `ecosystem.${product.id}`,
    kind: 'ecosystem',
    label: product.name,
    values: [`what is ${product.shortName}`, `open ${product.shortName}`, `${product.id} ecosystem`],
    markdown: `**${product.name}** is the ecosystem's ${product.role}: ${product.promise} Maturity: **${product.maturity}**.`,
    citations: [citation(`ecosystem-${product.id}`, product.name, href)],
  }))
}

const agentsKitClaims = claimsLedger.products.find(product => product.productId === 'agentskit')
for (const claim of [...(agentsKitClaims?.claims ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
  const source = agentsKitClaims.source.type === 'endpoint'
    ? agentsKitClaims.source.url
    : `https://github.com/${agentsKitClaims.source.repo}`
  entries.push(entry({
    id: `claim.${claim.id}`,
    kind: 'restricted-faq',
    label: `${claim.value} ${claim.noun}`,
    values: [`how many ${claim.noun} does agentskit have?`, `agentskit ${claim.noun} count`, `${claim.id} claim`],
    markdown: `The verified AgentsKit ledger currently reports **${claim.value} ${claim.noun}**.${claim.conservativeFloor === undefined ? '' : ` The public conservative floor is ${claim.conservativeFloor}.`}`,
    citations: [citation(`claim-${claim.id}`, `AgentsKit ${claim.noun} evidence`, source)],
  }))
}

entries.sort((a, b) => a.id.localeCompare(b.id))
const artifactBase = {
  protocol: DETERMINISTIC_KNOWLEDGE_PROTOCOL,
  version: DETERMINISTIC_KNOWLEDGE_PROTOCOL_VERSION,
  artifactId: 'agentskit-docs-v1',
  siteId: 'agentskit-docs',
  generatedAt,
  entries,
}
const contentHash = await computeLocalKnowledgeArtifactContentHash(artifactBase)
const artifact = { ...artifactBase, contentHash }
const verified = await verifyLocalKnowledgeArtifact(artifact, { expectedContentHash: contentHash, expectedSiteId: artifact.siteId })
if (!verified.ok) throw new Error(verified.diagnostic.message)

const serializedArtifact = `${JSON.stringify(artifact, null, 2)}\n`
const byteLength = new TextEncoder().encode(serializedArtifact).byteLength
if (byteLength > budgetBytes || byteLength > DETERMINISTIC_ARTIFACT_MAX_BYTES) {
  throw new Error(`Deterministic knowledge artifact is ${byteLength} bytes; budget is ${budgetBytes} bytes.`)
}
const site = DeterministicSiteConfigSchema.parse({
  protocol: DETERMINISTIC_SITE_PROTOCOL,
  version: DETERMINISTIC_SITE_PROTOCOL_VERSION,
  siteId: artifact.siteId,
  artifact: { href: `/deterministic-knowledge/${contentHash.slice('sha256:'.length)}.json`, contentHash },
  fallback: { mode: 'backend' },
})

const libDir = join(appRoot, 'lib')
const publicDir = join(appRoot, 'public/deterministic-knowledge')
await mkdir(libDir, { recursive: true })
await mkdir(publicDir, { recursive: true })
for (const file of await readdir(publicDir)) {
  if (file.endsWith('.json')) await unlink(join(publicDir, file))
}
await Promise.all([
  writeFile(join(libDir, 'deterministic-knowledge.generated.json'), serializedArtifact),
  writeFile(join(libDir, 'deterministic-site.generated.json'), `${JSON.stringify(site, null, 2)}\n`),
  writeFile(join(publicDir, `${contentHash.slice('sha256:'.length)}.json`), serializedArtifact),
])

const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()
console.log(`deterministic knowledge: ${entries.length} entries, ${byteLength}/${budgetBytes} bytes, ${contentHash}, source ${revision}`)
