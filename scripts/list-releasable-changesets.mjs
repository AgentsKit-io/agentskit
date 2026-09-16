#!/usr/bin/env node
/**
 * Prints one line per changeset that `changeset version` will consume, i.e.
 * changesets naming at least one package not listed under `ignore` in
 * .changeset/config.json. Prints nothing when none are pending. Used by the
 * release workflow to decide whether a release run has anything to version.
 */
import { readFile, readdir } from 'node:fs/promises'
import { listReleasableChangesets } from './lib/release-registry.mjs'

const changesetsRoot = new URL('../.changeset/', import.meta.url)
const config = JSON.parse(await readFile(new URL('./config.json', changesetsRoot), 'utf8'))
const files = (await readdir(changesetsRoot)).filter(name => name.endsWith('.md'))
const changesets = await Promise.all(files.map(async name => ({
  name,
  content: await readFile(new URL(`./${name}`, changesetsRoot), 'utf8'),
})))
for (const changeset of listReleasableChangesets(changesets, config.ignore ?? [])) {
  process.stdout.write(`${changeset.name}: ${changeset.packages.join(', ')}\n`)
}
