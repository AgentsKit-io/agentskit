#!/usr/bin/env node
/**
 * Publish the repository machine-readable index from the Doc Bridge index.
 * The site route remains the runtime canonical surface; this is the repository
 * copy and must preserve the same product separation and URL form.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const site = 'https://www.agentskit.io'

/*
 * The section below lists the condensed per-package handoffs under `for-agents`, and nothing else.
 * Doc Bridge used to index only those pages, so iterating the whole knowledge set was the same
 * list; since it started indexing every document the two diverged, and an unfiltered loop emitted
 * one entry per document — blog and archive paths that `docsUrl` cannot map, filenames in place of
 * titles, and stray MDX import lines as descriptions. Naming the root keeps the published file the
 * curated index it claims to be.
 */
const agentDocsRoot = 'apps/docs-next/content/docs/for-agents/'
const bridge = JSON.parse(readFileSync(join(root, '.doc-bridge/index.json'), 'utf8'))
const ecosystem = JSON.parse(readFileSync(join(root, 'ecosystem.json'), 'utf8'))

function titleFor(item) {
  const title = String(item.title ?? '').replace(/^(?:peers?|or):?$/i, '').trim()
  return title || item.id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function docsUrl(path) {
  const relative = path
    .replace(/^apps\/docs-next\/content\/docs\//, '')
    .replace(/\.(md|mdx)$/, '')
  return `${site}/docs/${relative}`
}

const lines = [
  '# AgentsKit',
  '',
  '> Machine-readable index for the AgentsKit JavaScript foundation and its public open-source siblings.',
  '',
  '## Foundation',
  '',
  `- [AgentsKit documentation](${site}/docs): TypeScript contracts, packages, integrations, recipes, production guidance, and agent handoffs.`,
  `- [For agents](${site}/docs/for-agents): condensed package references for machine consumption.`,
  `- [Full docs index](${site}/llms-full.txt): complete markdown corpus for LLM ingestion.`,
  '',
  '## Public open-source ecosystem',
  '',
]

for (const product of ecosystem.products.filter((item) => item.public)) {
  if (product.id === 'agentskit') continue
  lines.push(`- [${product.name}](${product.surfaces.home}): ${product.promise}`)
}

lines.push('', '## Agent reference pages', '')
const agentDocs = bridge.knowledge.filter((item) => String(item.path ?? '').startsWith(agentDocsRoot))
for (const item of [...agentDocs].sort((a, b) => a.id.localeCompare(b.id))) {
  lines.push(`- [${titleFor(item)}](${docsUrl(item.path)}): ${item.description ?? 'Agent-facing reference page.'}`)
}

lines.push('', '## Source and discovery', '')
lines.push(`- [Sitemap](${site}/sitemap.xml): machine-readable URL list.`)
lines.push('- [AgentsKit source](https://github.com/AgentsKit-io/agentskit): source, issues, and contribution history.')
lines.push('')

writeFileSync(join(root, 'llms.txt'), lines.join('\n'))
console.log(`wrote llms.txt: ${lines.length} lines`)
