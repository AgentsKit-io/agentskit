#!/usr/bin/env node
/**
 * CI gate: every public export from packages/<name>/src/index.ts must
 * appear at least once in apps/docs-next/content/docs/for-agents/<name>.mdx.
 * Catches drift between code and the agent-discoverable reference.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const docsDir = join(root, 'apps/docs-next/content/docs/for-agents')
const packagesDir = join(root, 'packages')

const SKIP_PAGES = new Set(['index', 'angular', 'react-native'])
const SKIP_PACKAGES = new Set(['framework-adapters', 'templates'])

const IGNORE_EXPORTS = {
  core: new Set(['normalizeChunk', 'flushPending', 'mergeStreamChunks']),
  adapters: new Set(['createOpenAICompatibleAdapter', 'cohereAdapter', 'groqAdapter']),
  // Bindings re-export core helpers for ergonomic imports — those are
  // documented on the core for-agents page; no need to repeat in each.
  ink: new Set([
    'createChatController', 'createInMemoryMemory', 'createLocalStorageMemory',
    'createStaticRetriever', 'formatRetrievedDocuments',
  ]),
  react: new Set([
    'createInMemoryMemory', 'createLocalStorageMemory',
    'createStaticRetriever', 'formatRetrievedDocuments',
  ]),
}

/**
 * Public *value* exports only. Type-only exports (interface, type alias,
 * `export type {...}` blocks, `export { type Foo }`) are intentionally
 * skipped — for-agents pages document the runtime surface, not every
 * supporting type.
 */
function listExports(srcIndex) {
  const text = readFileSync(srcIndex, 'utf8')
  const names = new Set()

  const blockRe = /export\s*(type)?\s*\{([^}]+)\}/g
  let m
  while ((m = blockRe.exec(text))) {
    if (m[1]) continue // entire block is type-only
    for (const piece of m[2].split(',')) {
      const trimmed = piece.trim()
      if (!trimmed) continue
      if (trimmed.startsWith('type ') || trimmed.startsWith('type\t')) continue
      const asMatch = trimmed.match(/\bas\s+([A-Za-z0-9_$]+)/)
      const name = asMatch ? asMatch[1] : trimmed.split(/\s+/)[0]
      if (name) names.add(name)
    }
  }

  const declRe = /export\s+(?:declare\s+)?(const|function|class|enum)\s+([A-Za-z0-9_$]+)/g
  while ((m = declRe.exec(text))) names.add(m[2])

  return names
}

function readDocBody(slug) {
  const file = join(docsDir, `${slug}.mdx`)
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

const violations = []
const checked = []

for (const pkg of readdirSync(packagesDir)) {
  if (SKIP_PACKAGES.has(pkg)) continue
  const srcIndex = join(packagesDir, pkg, 'src/index.ts')
  let stat
  try {
    stat = statSync(srcIndex)
  } catch {
    continue
  }
  if (!stat.isFile()) continue

  const slug = pkg
  if (SKIP_PAGES.has(slug)) continue

  const doc = readDocBody(slug)
  if (doc === null) {
    violations.push(`packages/${pkg}: no for-agents/${slug}.mdx`)
    continue
  }

  const items = listExports(srcIndex)
  const ignore = IGNORE_EXPORTS[pkg] ?? new Set()
  const missing = []
  for (const name of items) {
    if (ignore.has(name)) continue
    const re = new RegExp(`(?:^|[^A-Za-z0-9_])${name.replace(/[$]/g, '\\$')}(?:[^A-Za-z0-9_]|$)`)
    if (!re.test(doc)) missing.push(name)
  }

  checked.push({ pkg, total: items.size, missing: missing.length })
  if (missing.length > 0) {
    violations.push(
      `packages/${pkg}: ${missing.length} export(s) not mentioned in for-agents/${slug}.mdx:\n    ${missing.join(', ')}`,
    )
  }
}

if (violations.length > 0) {
  console.error('for-agents documentation drift detected.')
  console.error('')
  for (const v of violations) console.error('  - ' + v)
  console.error('')
  console.error(`${violations.length} package(s) with drift.`)
  console.error('Add the missing entries to the for-agents page, or extend')
  console.error('IGNORE_EXPORTS in scripts/check-for-agents-coverage.mjs.')
  process.exit(1)
}

console.log(`for-agents coverage clean across ${checked.length} packages.`)
