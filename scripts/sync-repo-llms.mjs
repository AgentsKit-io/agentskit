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
  '# AgentsKit.js',
  '',
  '> Machine-readable index for the AgentsKit JavaScript foundation, its public open-source siblings, and the optional managed AKOS layer.',
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

lines.push('', '## Optional managed layer', '')
for (const product of ecosystem.products.filter((item) => item.distributionClass === 'managed-service')) {
  lines.push(`- [${product.name}](${product.surfaces.home}): ${product.promise} Optional; not required to use the open-source products and not part of the open-source package catalog.`)
}

lines.push('', '## Agent reference pages', '')
for (const item of [...bridge.knowledge].sort((a, b) => a.id.localeCompare(b.id))) {
  lines.push(`- [${titleFor(item)}](${docsUrl(item.path)}): ${item.description ?? 'Agent-facing reference page.'}`)
}

lines.push('', '## Source and discovery', '')
lines.push(`- [Sitemap](${site}/sitemap.xml): machine-readable URL list.`)
lines.push('- [AgentsKit source](https://github.com/AgentsKit-io/agentskit): source, issues, and contribution history.')
lines.push('')

writeFileSync(join(root, 'llms.txt'), lines.join('\n'))
console.log(`wrote llms.txt: ${lines.length} lines`)
