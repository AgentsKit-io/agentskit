#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { classifyRegistryVersion, evaluateRegistryState, formatRegistryReport, listReleasableChangesets } from './lib/release-registry.mjs'

const knownArguments = new Set(['--', '--json', '--allow-unpublished-with-changesets'])
const unknownArguments = process.argv.slice(2).filter(argument => !knownArguments.has(argument))
if (unknownArguments.length > 0) throw new Error(`unknown argument: ${unknownArguments[0]}`)

const packagesRoot = new URL('../packages/', import.meta.url)
const changesetsRoot = new URL('../.changeset/', import.meta.url)

async function loadPublicPackages() {
  const packages = []
  for (const directory of await readdir(packagesRoot)) {
    try {
      const manifest = JSON.parse(await readFile(new URL(`./${directory}/package.json`, packagesRoot), 'utf8'))
      if (manifest.private !== true) packages.push({ name: manifest.name, localVersion: manifest.version })
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return packages.sort((left, right) => left.name.localeCompare(right.name))
}

async function loadRegistryMetadata(name) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (response.status === 404) return { missing: true }
  if (!response.ok) throw new Error(`${name}: registry returned HTTP ${response.status}`)
  const body = await response.json()
  return {
    missing: false,
    latest: body['dist-tags']?.latest,
    versions: Object.keys(body.versions ?? {}),
  }
}

const packages = await loadPublicPackages()
const changesetConfig = JSON.parse(await readFile(new URL('./config.json', changesetsRoot), 'utf8'))
const changesetFiles = (await readdir(changesetsRoot)).filter(name => name.endsWith('.md'))
const changesets = await Promise.all(changesetFiles.map(async name => ({
  name,
  content: await readFile(new URL(`./${name}`, changesetsRoot), 'utf8'),
})))
const releasableChangesets = listReleasableChangesets(changesets, changesetConfig.ignore ?? [])
const entries = await Promise.all(packages.map(async item =>
  classifyRegistryVersion({ ...item, metadata: await loadRegistryMetadata(item.name) }),
))
// Only changesets that `changeset version` consumes count; ignored-package
// changesets stay in .changeset/ forever and must not block a release train.
const hasPendingChangesets = releasableChangesets.length > 0
const allowRecovery = process.argv.includes('--allow-unpublished-with-changesets')
const report = evaluateRegistryState(entries, { hasPendingChangesets, allowRecovery })

if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify({ ...report, hasPendingChangesets, allowRecovery }, null, 2)}\n`)
else {
  process.stdout.write(formatRegistryReport(report, { hasPendingChangesets, allowRecovery }))
  const ignoredOnly = changesetFiles.length - releasableChangesets.length
  if (ignoredOnly > 0) process.stdout.write(`- ignored-package changesets (not counted): ${ignoredOnly}\n`)
}
if (!report.ok) process.exitCode = 1
