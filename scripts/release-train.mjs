#!/usr/bin/env node
/**
 * release-train — propose coordinated dependency updates from `release-train.json`.
 *
 *   node scripts/release-train.mjs --check            # validate manifest and workspace alignment
 *   node scripts/release-train.mjs --plan             # print proposed updates as JSON (queries npm)
 *   node scripts/release-train.mjs --apply [--body f] # rewrite manifest/package.json, write PR body
 *
 * Never merges or publishes: the workflow only opens a draft PR for human review.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyToManifest, applyToPackageJson, findDrift, findPeerViolations, planUpdates, renderChangeset, renderProposal, validateManifest } from './lib/release-train.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

function workspaceFiles() {
  const files = [join(root, 'package.json')]
  for (const parent of ['packages', 'apps']) {
    if (!existsSync(join(root, parent))) continue
    for (const entry of readdirSync(join(root, parent), { withFileTypes: true })) {
      const file = join(root, parent, entry.name, 'package.json')
      if (entry.isDirectory() && existsSync(file)) files.push(file)
    }
  }
  return files.map((file) => ({ file, json: readJson(file) }))
}

async function latestVersions(names) {
  const latest = {}
  for (const name of names) {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(`${name}: registry returned HTTP ${response.status}`)
    latest[name] = (await response.json()).version
  }
  return latest
}

const args = process.argv.slice(2)
const manifestPath = join(root, 'release-train.json')
const manifest = readJson(manifestPath)
const problems = validateManifest(manifest)
if (problems.length > 0) {
  process.stderr.write(`release-train.json is invalid:\n${problems.map((item) => `  - ${item}`).join('\n')}\n`)
  process.exit(1)
}

if (args.includes('--check')) {
  const workspace = workspaceFiles().map(({ file, json }) => ({ file: file.replace(`${root}/`, ''), json }))
  const drift = findDrift(manifest, workspace)
  const peers = findPeerViolations(manifest, workspace)
  if (peers.length > 0) {
    process.stderr.write(`peer ranges promise support below the manifest minimum:\n${peers.map((p) => `  - ${p.file} peer ${p.name} ${p.range} (minimum ${p.minimum})`).join('\n')}\n`)
    process.exit(1)
  }
  if (drift.length > 0) {
    process.stderr.write(`workspace ranges drift from release-train.json:\n${drift.map((d) => `  - ${d.file} ${d.field}.${d.name} ${d.range} (manifest ${d.current})`).join('\n')}\n`)
    process.exit(1)
  }
  process.stdout.write('release-train: manifest valid and workspace aligned\n')
} else if (args.includes('--plan') || args.includes('--apply')) {
  const names = manifest.groups.flatMap((group) => Object.keys(group.packages))
  const updates = planUpdates(manifest, await latestVersions(names))
  if (args.includes('--plan')) process.stdout.write(`${JSON.stringify(updates, null, 2)}\n`)
  else if (updates.length === 0) process.stdout.write('release-train: no coordinated updates available\n')
  else {
    writeJson(manifestPath, applyToManifest(manifest, updates))
    const publicPackages = []
    for (const { file, json } of workspaceFiles()) {
      const next = applyToPackageJson(json, updates)
      if (JSON.stringify(next) !== JSON.stringify(json)) {
        writeJson(file, next)
        if (file.includes(`${join(root, 'packages')}/`) && json.private !== true) publicPackages.push(json.name)
      }
    }
    const changeset = renderChangeset(updates, publicPackages)
    if (changeset) writeFileSync(join(root, '.changeset', 'release-train-update.md'), changeset)
    const bodyIndex = args.indexOf('--body')
    if (bodyIndex !== -1) writeFileSync(args[bodyIndex + 1], renderProposal(updates, manifest))
    process.stdout.write(`release-train: applied ${updates.length} group update(s)\n`)
  }
} else {
  process.stderr.write('usage: release-train.mjs --check | --plan | --apply [--body <file>]\n')
  process.exit(2)
}
