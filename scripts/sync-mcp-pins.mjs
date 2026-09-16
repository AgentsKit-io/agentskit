#!/usr/bin/env node
/**
 * Keep every pinned `@agentskit/mcp@X.Y.Z` reference aligned with
 * packages/mcp/package.json.
 *
 * The coding-agent recipes, content-pipeline atoms, MCP README, fixtures, and
 * README Standard evidence all pin the published MCP package version, and
 * scripts/content-pipeline.test.mjs fails when any of them drift. Before this
 * script existed, every release that bumped @agentskit/mcp required hand
 * edits inside the changesets "version packages" PR (see #1573).
 *
 * `pnpm release:version` runs this after `changeset version`. Generated
 * artifacts that embed the same strings (.doc-bridge/index.json, README
 * Standard hashes) are refreshed by the steps that follow it.
 *
 * Usage:
 *   node scripts/sync-mcp-pins.mjs          # rewrite pins in place
 *   node scripts/sync-mcp-pins.mjs --check  # exit 1 if any pin drifts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MCP_PIN_FILES = [
  'apps/docs-next/content/docs/for-agents/mcp.mdx',
  'apps/docs-next/content/docs/reference/recipes/coding-agent-mcp.mdx',
  'apps/docs-next/content/docs/reference/recipes/mcp-bridge.mdx',
  'docs/ecosystem/content-pipeline/atoms/coding-agent-mcp/atom.json',
  'docs/ecosystem/content-pipeline/atoms/coding-agent-mcp/carousel-storyboard.md',
  'docs/ecosystem/content-pipeline/atoms/coding-agent-mcp/community-post.md',
  'docs/ecosystem/content-pipeline/atoms/coding-agent-mcp/docs.mdx',
  'docs/ecosystem/content-pipeline/atoms/coding-agent-mcp/example.json',
  'docs/ecosystem/content-pipeline/atoms/coding-agent-mcp/social-thread.md',
  'docs/ecosystem/content-pipeline/recipes/coding-agent-mcp.json',
  'packages/mcp/README.md',
  'packages/mcp/llms-install.md',
  'packages/mcp/fixtures/coding-agent-hosts.ts',
  'packages/mcp/fixtures/run-published-coding-agent-hosts.mjs',
  'packages/mcp/tests/coding-agent-hosts.test.ts',
  'readme-standard-v1.json',
]

const PACKAGE_PIN = /@agentskit\/mcp@(\d+\.\d+\.\d+)/g
const SEMVER = /^\d+\.\d+\.\d+$/

/**
 * Rewrite `@agentskit/mcp@<old>` pins and, for each old version found that
 * way, YAML-style `version: <old>` lines, to `version`.
 * @param {string} source
 * @param {string} version
 * @returns {{ output: string, pins: string[] }} the rewritten text and the distinct versions that were pinned before
 */
export function syncMcpPins(source, version) {
  if (!SEMVER.test(version)) throw new Error(`invalid @agentskit/mcp version: ${version}`)
  const pins = [...new Set([...source.matchAll(PACKAGE_PIN)].map((match) => match[1]))]
  let output = source.replace(PACKAGE_PIN, `@agentskit/mcp@${version}`)
  for (const previous of pins) {
    if (previous === version) continue
    output = output.split(`version: ${previous}`).join(`version: ${version}`)
  }
  return { output, pins }
}

/**
 * @param {string} root repository root
 * @param {{ check?: boolean, log?: (line: string) => void }} [options]
 * @returns {{ version: string, drifted: string[], missing: string[] }}
 */
export function runSyncMcpPins(root, options = {}) {
  const { check = false, log = () => {} } = options
  const version = JSON.parse(readFileSync(join(root, 'packages/mcp/package.json'), 'utf8')).version
  const drifted = []
  const missing = []
  for (const relativePath of MCP_PIN_FILES) {
    const path = join(root, relativePath)
    const source = readFileSync(path, 'utf8')
    const { output, pins } = syncMcpPins(source, version)
    if (pins.length === 0) {
      missing.push(relativePath)
      continue
    }
    if (output === source) continue
    drifted.push(relativePath)
    if (check) continue
    writeFileSync(path, output)
    log(`${relativePath}: ${pins.join(', ')} → ${version}`)
  }
  return { version, drifted, missing }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const check = process.argv.includes('--check')
  const { version, drifted, missing } = runSyncMcpPins(process.cwd(), { check, log: (line) => console.log(line) })
  if (missing.length > 0) {
    console.error(`mcp pins: ${missing.length} file(s) no longer pin @agentskit/mcp; update MCP_PIN_FILES in scripts/sync-mcp-pins.mjs`)
    for (const path of missing) console.error(`  - ${path}`)
    process.exit(1)
  }
  if (check && drifted.length > 0) {
    console.error(`mcp pins: ${drifted.length} file(s) drift from @agentskit/mcp@${version}; run: node scripts/sync-mcp-pins.mjs`)
    for (const path of drifted) console.error(`  - ${path}`)
    process.exit(1)
  }
  console.log(`mcp pins: ${MCP_PIN_FILES.length} file(s) ${check ? 'match' : 'synchronized with'} @agentskit/mcp@${version} ✓`)
}
